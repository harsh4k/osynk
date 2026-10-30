/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/** Pure beat-grid math shared by the game loop and the music scheduler. */

export interface Tempo {
  /** Beats per minute of the generated track. */
  bpm: number;
  /** A target's timing point lands every this many beats. */
  beatsPerTarget: number;
}

export const beatMs = (bpm: number) => 60_000 / bpm;

/** Ms between consecutive target timing points. */
export const targetIntervalMs = (tempo: Tempo) => beatMs(tempo.bpm) * tempo.beatsPerTarget;

/**
 * Game time of the first target's timing point: the first beat late enough that the target can
 * spawn after `leadInMs` and still show its whole approach of `durationMs`.
 */
export function firstHitTime(tempo: Tempo, durationMs: number, leadInMs: number): number {
  const beat = beatMs(tempo.bpm);
  return Math.ceil((leadInMs + durationMs) / beat) * beat;
}

/** Index of the first beat at or after `timeMs`. */
export const beatIndexAtOrAfter = (timeMs: number, bpm: number) => Math.max(0, Math.ceil(timeMs / beatMs(bpm) - 1e-9));
