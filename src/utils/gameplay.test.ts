import { describe, expect, it } from 'vitest';
import { CIRCLE_RADIUS, MIN_SPAWN_SEPARATION, findTargetAt, hitWindow, pickSpawnPoint, pointsForAccuracy, spawnBounds, timingAccuracy } from './gameplay';

const target = (id: string, x: number, startTime: number, extra = {}) => ({
  id, position: { x, y: 0, z: 0 }, startTime, hit: false, missed: false, ...extra,
});

describe('findTargetAt', () => {
  it('picks the oldest of overlapping targets', () => {
    const targets = [target('new', 0.2, 500), target('old', 0, 100)];
    expect(findTargetAt(targets, { x: 0.1, y: 0, z: 0 })?.id).toBe('old');
  });

  it('skips hit and missed targets', () => {
    const targets = [target('a', 0, 0, { hit: true }), target('b', 0, 1, { missed: true })];
    expect(findTargetAt(targets, { x: 0, y: 0, z: 0 })).toBeUndefined();
  });

  it('uses the circle radius as the hit area', () => {
    const targets = [target('a', 0, 0)];
    expect(findTargetAt(targets, { x: CIRCLE_RADIUS - 0.01, y: 0, z: 0 })).toBeDefined();
    expect(findTargetAt(targets, { x: CIRCLE_RADIUS + 0.01, y: 0, z: 0 })).toBeUndefined();
  });
});

describe('timing', () => {
  it('is perfect on the timing point and drops off either side', () => {
    expect(timingAccuracy(1000, 1000)).toBe(1);
    expect(timingAccuracy(500, 1000)).toBe(0.5);
    expect(timingAccuracy(0, 1000)).toBe(0);
    expect(pointsForAccuracy(1)).toBe(300);
    expect(pointsForAccuracy(0.8)).toBe(100);
    expect(pointsForAccuracy(0.65)).toBe(50);
  });

  it('opens the hit window late in the approach and closes it shortly after', () => {
    expect(hitWindow(500, 1000)).toBe('early');
    expect(hitWindow(600, 1000)).toBe('inside');
    expect(hitWindow(1050, 1000)).toBe('inside');
    expect(hitWindow(1051, 1000)).toBe('late');
  });
});

describe('pickSpawnPoint', () => {
  it('never places a new target on top of a live one', () => {
    const field = { halfWidth: 13, halfHeight: 8 };
    for (let run = 0; run < 500; run++) {
      const live = [0, 1, 2].map(() => pickSpawnPoint(field, []));
      const p = pickSpawnPoint(field, live);
      for (const q of live) {
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(MIN_SPAWN_SEPARATION);
      }
    }
  });
});

describe('spawnBounds', () => {
  it('never goes negative on tiny screens', () => {
    const b = spawnBounds({ halfWidth: 0.5, halfHeight: 0.5 });
    expect(b.halfWidth).toBe(0);
    expect(b.halfHeight).toBe(0);
  });
});
