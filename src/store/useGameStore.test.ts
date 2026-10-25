import { beforeEach, describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIG, DifficultyMode, useGameStore } from './useGameStore';
import { spawnBounds } from '../utils/gameplay';

const store = () => useGameStore.getState();

/** Drive the game loop with 16 ms ticks from `from` to `to` (wall-clock ms). Returns `to`. */
function run(from: number, to: number, step = 16): number {
  for (let t = from; t <= to; t += step) store().updateGame(t);
  return to;
}

function start(mode: DifficultyMode) {
  store().endGame();
  store().setPlayfield({ halfWidth: 13, halfHeight: 8 });
  store().startGame(mode);
  store().updateGame(0); // first tick only anchors the clock
}

/** Run until the first target exists, then return it and the wall time. */
function firstTarget(now = 0) {
  while (store().targets.length === 0) store().updateGame((now += 16));
  return { target: store().targets[0], now };
}

beforeEach(() => start('NORMAL'));

describe('missing targets', () => {
  it('does not end the run on a single miss', () => {
    const { target, now } = firstTarget();
    run(now, now + target.duration + 100);
    expect(store().showFailScreen).toBe(false);
    expect(store().gameActive).toBe(true);
    expect(store().health).toBeCloseTo(1 - DIFFICULTY_CONFIG.NORMAL.missPenalty);
  });

  it('resets the combo on a miss', () => {
    const { target, now } = firstTarget();
    useGameStore.setState({ combo: 5 });
    run(now, now + target.duration + 100);
    expect(store().combo).toBe(0);
  });

  it('fails once health runs out', () => {
    run(16, 20_000);
    expect(store().showFailScreen).toBe(true);
    expect(store().health).toBe(0);
    expect(store().targets).toEqual([]);
  });

  it('fails on exactly the miss that empties health', () => {
    for (const mode of ['EASY', 'NORMAL', 'INSANE'] as const) {
      const missesToFail = Math.round(1 / DIFFICULTY_CONFIG[mode].missPenalty);
      start(mode);
      let misses = 0;
      let now = 0;
      let lastHealth = 1;
      while (!store().showFailScreen && now < 120_000) {
        store().updateGame((now += 16));
        if (store().health < lastHealth) misses++;
        lastHealth = store().health;
      }
      expect(store().showFailScreen).toBe(true);
      expect(misses).toBe(missesToFail);
    }
  });

  it('never fails in practice and keeps the combo', () => {
    start('PRACTICE');
    useGameStore.setState({ combo: 3 });
    run(16, 20_000);
    expect(store().showFailScreen).toBe(false);
    expect(store().combo).toBe(3);
  });

  it('does not mutate targets in place when they are missed', () => {
    const { target, now } = firstTarget();
    run(now, now + target.duration + 100);
    expect(target.missed).toBe(false);
    expect(store().targets.find((t) => t.id === target.id)?.missed).toBe(true);
  });
});

describe('hitting targets', () => {
  it('scores 300 for a hit on the timing point', () => {
    let { target, now } = firstTarget();
    now = run(now, now + target.duration - 16);
    store().hitAt(target.position, now + 16);
    expect(store().score).toBe(300);
    expect(store().combo).toBe(1);
    expect(store().targets.find((t) => t.id === target.id)?.hit).toBe(true);
  });

  it('ignores taps outside the circle', () => {
    const { target, now } = firstTarget();
    store().hitAt({ x: target.position.x + 1, y: target.position.y, z: 0 }, now);
    expect(store().score).toBe(0);
  });

  it('only counts a target once', () => {
    let { target, now } = firstTarget();
    now = run(now, now + target.duration);
    store().hitAt(target.position, now);
    store().hitAt(target.position, now);
    expect(store().combo).toBe(1);
  });

  it('treats a too-early tap as a miss so mashing does not work', () => {
    const { target, now } = firstTarget();
    useGameStore.setState({ combo: 4 });
    store().hitAt(target.position, now);
    expect(store().score).toBe(0);
    expect(store().combo).toBe(0);
    expect(store().health).toBeCloseTo(1 - DIFFICULTY_CONFIG.NORMAL.missPenalty);
    expect(store().targets.find((t) => t.id === target.id)?.missed).toBe(true);
  });

  it('does not score a tap after the late window closes, even between ticks', () => {
    let { target, now } = firstTarget();
    now = run(now, now + target.duration + 32);
    // 30 ms after the last tick puts the target past duration + 50 ms.
    store().hitAt(target.position, now + 30);
    expect(store().score).toBe(0);
  });
});

describe('pause', () => {
  it('stops the game clock so targets survive a long pause', () => {
    const { target, now } = firstTarget();
    store().togglePause();
    const resumedAt = run(now, now + 10_000);
    store().togglePause();
    run(resumedAt, resumedAt + 32);
    expect(store().health).toBe(1);
    expect(store().targets.find((t) => t.id === target.id)?.missed).toBe(false);
  });

  it('ignores taps while paused', () => {
    const { target, now } = firstTarget();
    store().togglePause();
    store().hitAt(target.position, now);
    expect(store().score).toBe(0);
  });
});

describe('spawning', () => {
  it('caps the spread on very wide screens', () => {
    const b = spawnBounds({ halfWidth: 20.5, halfHeight: 11.5 });
    expect(b.halfWidth).toBeLessThanOrEqual(9);
    expect(b.halfHeight).toBeLessThanOrEqual(6);
  });

  it('keeps every target inside a phone-sized playfield', () => {
    start('PRACTICE');
    const field = { halfWidth: 5.3, halfHeight: 11.5 };
    store().setPlayfield(field);
    const bounds = spawnBounds(field);
    const seen = new Set<string>();
    let now = 0;
    while (seen.size < 200) {
      store().updateGame((now += 16));
      for (const t of store().targets) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        for (const p of [t.position, ...(t.sliderPath ?? [])]) {
          expect(Math.abs(p.x)).toBeLessThanOrEqual(bounds.halfWidth);
          expect(Math.abs(p.y)).toBeLessThanOrEqual(bounds.halfHeight);
        }
      }
    }
  });
});
