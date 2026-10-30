/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Owns the single AudioContext and schedules the generated track against the game clock.
 *
 * Sync model: the game clock (store `gameTime`) is the master. When audio starts (and again after
 * every resume) the engine records `anchor`, the AudioContext time at which game time 0 would be
 * heard. Beat k is then scheduled at a fixed audio time, anchor + k beats, minus output latency, so
 * the grid never drifts with tick jitter. Beats are queued a short lookahead ahead of game time.
 */

import { beatIndexAtOrAfter, beatMs } from '../utils/rhythm';
import { createNoiseBuffer, failSound, hitSound, missSound, scheduleBeat } from './synth';

/** How far past the current game time beats are queued, on top of the output latency. */
const LOOKAHEAD_MS = 150;
/**
 * Largest gap between the game clock and the audio clock before the grid is re-anchored, and how
 * many ticks in a row it must last. The audio clock moves in buffer-sized steps (up to ~40 ms on
 * some systems), so single readings are noisy; only sustained drift (a slow device) re-anchors.
 */
const MAX_DRIFT_S = 0.08;
const DRIFT_TICKS = 5;
const MUTE_KEY = 'osynk:muted';
const VOLUME = 0.6;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** Per-run bus. Replaced on pause and stop so notes already queued go silent. */
let track: GainNode | null = null;
let bpm = 120;
let nextBeat = 0;
/** AudioContext time (seconds) at which game time 0 is heard, or null until audio is running. */
let anchor: number | null = null;
/** Output latency used for the current anchor, so later latency revisions don't read as drift. */
let anchorLatency = 0;
let driftTicks = 0;
let trackActive = false;
let lastResumeAttempt = 0;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

const ignore = () => {};

/**
 * Create or resume the AudioContext. Must be called from a user gesture (click or key).
 * Never throws: without working audio the game still plays, silently.
 */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const c = new Ctor();
      const compressor = c.createDynamicsCompressor();
      compressor.connect(c.destination);
      const gain = c.createGain();
      gain.gain.value = muted ? 0 : VOLUME;
      gain.connect(compressor);
      noise = createNoiseBuffer(c);
      master = gain;
      ctx = c;
    }
    if (ctx.state !== 'running') ctx.resume().catch(ignore);
  } catch {
    ctx = null;
    master = null;
  }
}

const outputLatency = (c: AudioContext) => c.outputLatency || c.baseLatency || 0;

/** Swap in a fresh bus, fading out (and dropping) everything queued on the old one. */
function replaceTrackBus(): void {
  if (!ctx || !master) return;
  const old = track;
  if (old) {
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    setTimeout(() => old.disconnect(), 200);
  }
  track = ctx.createGain();
  track.connect(master);
}

export function startTrack(trackBpm: number): void {
  if (!ctx || !master) return;
  bpm = trackBpm;
  nextBeat = 0;
  anchor = null;
  trackActive = true;
  replaceTrackBus();
  if (ctx.state !== 'running') ctx.resume().catch(ignore);
}

/** Queue every beat due within the lookahead of `gameTime`. Call on each game tick. */
export function scheduleTrack(gameTime: number): void {
  if (!ctx || !track || !noise || !trackActive) return;

  if (ctx.state !== 'running') {
    // The browser can suspend audio on its own (iOS interruptions, device changes). The context
    // was already unlocked by a gesture, so a plain resume usually works; keep trying quietly.
    const now = performance.now();
    if (now - lastResumeAttempt > 1000 && ctx.state !== 'closed') {
      lastResumeAttempt = now;
      anchor = null;
      nextBeat = beatIndexAtOrAfter(gameTime, bpm);
      ctx.resume().catch(ignore);
    }
    return;
  }

  // Re-anchor when the two clocks have drifted apart for several ticks, e.g. a slow device where
  // the game clock is capped per tick and falls behind real time.
  if (anchor !== null) {
    const drift = Math.abs(ctx.currentTime - (anchor + gameTime / 1000 + anchorLatency));
    driftTicks = drift > MAX_DRIFT_S ? driftTicks + 1 : 0;
    if (driftTicks >= DRIFT_TICKS) {
      anchor = null;
      nextBeat = Math.max(nextBeat, beatIndexAtOrAfter(gameTime, bpm));
    }
  }
  if (anchor === null) {
    anchorLatency = outputLatency(ctx);
    anchor = ctx.currentTime - gameTime / 1000 - anchorLatency;
    driftTicks = 0;
  }
  const latency = anchorLatency;

  const beat = beatMs(bpm);
  const horizon = gameTime + LOOKAHEAD_MS + latency * 1000;
  while (nextBeat * beat < horizon) {
    const when = anchor + (nextBeat * beat) / 1000;
    // A beat already heard-late by more than the output latency is skipped; within that it plays
    // a little late (this covers the first beat of a run and of a resume).
    if (when >= ctx.currentTime - latency - 0.01) scheduleBeat(ctx, track, noise, nextBeat, Math.max(when, ctx.currentTime), bpm);
    nextBeat++;
  }
}

export function stopTrack(): void {
  trackActive = false;
  anchor = null;
  if (!track || !ctx) return;
  const old = track;
  track = null;
  old.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
  setTimeout(() => old.disconnect(), 200);
}

/** Pause: drop queued beats (they would play late after resuming) and suspend the context. */
export function pauseAudio(): void {
  if (!ctx) return;
  if (trackActive) replaceTrackBus();
  anchor = null;
  if (ctx.state === 'running') ctx.suspend().catch(ignore);
}

/** Resume from `gameTime`: re-anchor on the next tick once the context is running again. */
export function resumeAudio(gameTime: number): void {
  if (!ctx) return;
  anchor = null;
  nextBeat = beatIndexAtOrAfter(gameTime, bpm);
  if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(ignore);
}

export function playHit(points: 300 | 100 | 50): void {
  if (ctx && master && ctx.state === 'running') hitSound(ctx, master, ctx.currentTime, points);
}

export function playMiss(): void {
  if (ctx && master && noise && ctx.state === 'running') missSound(ctx, master, noise, ctx.currentTime);
}

export function playFail(): void {
  if (ctx && master && ctx.state === 'running') failSound(ctx, master, ctx.currentTime);
}

export const isMuted = () => muted;

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable (private mode): the setting just won't persist.
  }
  if (ctx && master) master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.02);
}
