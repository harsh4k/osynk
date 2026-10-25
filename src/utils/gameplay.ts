/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/** Pure game rules, kept free of React and WebGL so they can be unit tested. */

export type Vector3 = { x: number; y: number; z: number };

/** Half extents of the visible play area on the z = 0 plane, in world units. */
export interface Playfield {
  halfWidth: number;
  halfHeight: number;
}

/** Radius of a hit circle in world units. Must match the circle geometry in HitCircles. */
export const CIRCLE_RADIUS = 0.8;

/** How long after its timing point a target can still be hit before it counts as a miss. */
export const LATE_WINDOW_MS = 50;

/**
 * Fraction of the approach time before which a tap is too early. A too-early tap on a circle
 * counts as a miss, so mashing keys can't clear the board.
 */
export const EARLY_WINDOW_FRACTION = 0.4;

// Keep targets clear of the screen edges and of the HUD (score top right, combo bottom right).
const EDGE_MARGIN = CIRCLE_RADIUS + 0.4;
const HUD_MARGIN_Y = 2.5;

// Spawns never spread wider than this, so wide screens don't get a harder, vignetted game.
const MAX_SPAWN: Playfield = { halfWidth: 9, halfHeight: 6 };

export const DEFAULT_PLAYFIELD: Playfield = { halfWidth: 13, halfHeight: 8 };

/** The rectangle targets may spawn in, for the given visible area. Never collapses below zero. */
export function spawnBounds(field: Playfield): Playfield {
  return {
    halfWidth: Math.min(MAX_SPAWN.halfWidth, Math.max(0, field.halfWidth - EDGE_MARGIN)),
    halfHeight: Math.min(MAX_SPAWN.halfHeight, Math.max(0, field.halfHeight - EDGE_MARGIN - HUD_MARGIN_Y)),
  };
}

const clamp = (v: number, limit: number) => Math.min(limit, Math.max(-limit, v));

/** A random point inside the spawn bounds. */
export function randomSpawnPoint(field: Playfield, random: () => number = Math.random): Vector3 {
  const b = spawnBounds(field);
  return {
    x: (random() * 2 - 1) * b.halfWidth,
    y: (random() * 2 - 1) * b.halfHeight,
    z: 0,
  };
}

/** A slider end point a short random distance from its start, clamped inside the spawn bounds. */
export function randomSliderEnd(start: Vector3, field: Playfield, random: () => number = Math.random): Vector3 {
  const b = spawnBounds(field);
  return {
    x: clamp(start.x + (random() - 0.5) * 8, b.halfWidth),
    y: clamp(start.y + (random() - 0.5) * 8, b.halfHeight),
    z: 0,
  };
}

/**
 * Timing accuracy for a hit at `age` ms into a target that should be hit at `duration` ms.
 * 1 is perfect, 0 is a hit at the moment the target appeared.
 */
export function timingAccuracy(age: number, duration: number): number {
  return Math.max(0, 1 - Math.abs(1 - age / duration));
}

/** Where a tap at `age` ms falls relative to a target's hit window. */
export function hitWindow(age: number, duration: number): 'early' | 'inside' | 'late' {
  if (age < duration * (1 - EARLY_WINDOW_FRACTION)) return 'early';
  if (age > duration + LATE_WINDOW_MS) return 'late';
  return 'inside';
}

/** Base points for a hit inside the window, before the combo multiplier. */
export function pointsForAccuracy(accuracy: number): 300 | 100 | 50 {
  if (accuracy > 0.85) return 300;
  if (accuracy > 0.7) return 100;
  return 50;
}

/** Health change for a hit of the given value. */
export function healthGainForPoints(points: 300 | 100 | 50): number {
  if (points === 300) return 0.05;
  if (points === 100) return 0.03;
  return 0.01;
}

interface Hittable {
  id: string;
  position: Vector3;
  hit: boolean;
  missed: boolean;
  startTime: number;
}

/**
 * The live target under `point`, if any. When circles overlap, the oldest one wins,
 * because it is the one whose timing point comes first.
 */
export function findTargetAt<T extends Hittable>(targets: readonly T[], point: Vector3): T | undefined {
  let best: T | undefined;
  for (const t of targets) {
    if (t.hit || t.missed) continue;
    const dx = t.position.x - point.x;
    const dy = t.position.y - point.y;
    if (dx * dx + dy * dy > CIRCLE_RADIUS * CIRCLE_RADIUS) continue;
    if (!best || t.startTime < best.startTime) best = t;
  }
  return best;
}
