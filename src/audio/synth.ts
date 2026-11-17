/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * The generated soundtrack and sound effects, built from Web Audio nodes only (no audio files).
 * Every function takes the context and destination so the same code can render into an
 * OfflineAudioContext for checks.
 */

import { beatMs } from '../utils/rhythm';

// A minor loop: Am – F – C – G, one chord per bar. Frequencies of each chord's root in octave 2.
const BAR_ROOTS = [110, 87.31, 130.81, 98];
// Chord tones as semitone offsets from the root (minor for Am, major for the rest).
const BAR_CHORDS = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
const BEATS_PER_BAR = 4;
/** Bars of drums only before the bass and arpeggio come in. */
const INTRO_BARS = 2;

const semitone = (root: number, steps: number) => root * 2 ** (steps / 12);

export function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A gain envelope: instant attack to `peak`, exponential decay over `decay` seconds. */
function envelope(ctx: BaseAudioContext, dest: AudioNode, when: number, peak: number, decay: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  gain.connect(dest);
  return gain;
}

function kick(ctx: BaseAudioContext, dest: AudioNode, when: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
  osc.connect(envelope(ctx, dest, when, 0.9, 0.35));
  osc.start(when);
  osc.stop(when + 0.4);
}

function noiseHit(
  ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, when: number,
  filter: BiquadFilterType, freq: number, peak: number, decay: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bq = ctx.createBiquadFilter();
  bq.type = filter;
  bq.frequency.value = freq;
  src.connect(bq);
  bq.connect(envelope(ctx, dest, when, peak, decay));
  src.start(when, Math.random() * 0.5);
  src.stop(when + decay + 0.05);
}

function tone(
  ctx: BaseAudioContext, dest: AudioNode, when: number,
  type: OscillatorType, freq: number, peak: number, decay: number, cutoff?: number,
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  const env = envelope(ctx, dest, when, peak, decay);
  if (cutoff) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    osc.connect(lp);
    lp.connect(env);
  } else {
    osc.connect(env);
  }
  osc.start(when);
  osc.stop(when + decay + 0.05);
}

/** Schedule everything that sounds during beat `index`, starting at audio time `when`. */
export function scheduleBeat(
  ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, index: number, when: number, bpm: number,
) {
  const beat = beatMs(bpm) / 1000;
  const half = beat / 2;
  const bar = Math.floor(index / BEATS_PER_BAR);
  const step = index % BEATS_PER_BAR;
  const chord = bar % BAR_ROOTS.length;
  const root = BAR_ROOTS[chord];

  kick(ctx, dest, when);
  if (step === 1 || step === 3) noiseHit(ctx, dest, noise, when, 'bandpass', 1800, 0.35, 0.18);
  noiseHit(ctx, dest, noise, when + half, 'highpass', 7000, 0.12, 0.05);

  if (bar < INTRO_BARS) return;

  // Driving eighth-note bass on the chord root.
  tone(ctx, dest, when, 'sawtooth', root, 0.22, half * 0.9, 500);
  tone(ctx, dest, when + half, 'sawtooth', root, 0.16, half * 0.9, 500);

  // Arpeggio up through the chord, two octaves above the bass.
  const tones = BAR_CHORDS[chord];
  const note = tones[(step * 2) % tones.length];
  const next = tones[(step * 2 + 1) % tones.length];
  tone(ctx, dest, when, 'triangle', semitone(root * 4, note), 0.08, half * 1.6);
  tone(ctx, dest, when + half, 'triangle', semitone(root * 4, next), 0.06, half * 1.6);
}

/** A bright blip for a hit; higher for a better judgement. */
export function hitSound(ctx: BaseAudioContext, dest: AudioNode, when: number, points: 300 | 100 | 50) {
  const freq = points === 300 ? 1320 : points === 100 ? 990 : 740;
  tone(ctx, dest, when, 'sine', freq, 0.28, 0.12);
  tone(ctx, dest, when, 'triangle', freq * 2, 0.06, 0.06);
}

/** A dull thud for a miss. */
export function missSound(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, when: number) {
  noiseHit(ctx, dest, noise, when, 'lowpass', 400, 0.5, 0.2);
}

/** A falling sweep when the run fails. */
export function failSound(ctx: BaseAudioContext, dest: AudioNode, when: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440, when);
  osc.frequency.exponentialRampToValueAtTime(55, when + 0.9);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  osc.connect(lp);
  lp.connect(envelope(ctx, dest, when, 0.3, 1));
  osc.start(when);
  osc.stop(when + 1.05);
}
