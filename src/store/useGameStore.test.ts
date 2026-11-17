import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DIFFICULTY_CONFIG, DifficultyMode, getGameTime, useGameStore } from './useGameStore';
import { RUN_LENGTH_MS, spawnBounds } from '../utils/gameplay';
import { loadBests, setScoreStorage } from '../utils/highScores';
import { beatMs, targetIntervalMs } from '../utils/rhythm';
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
const items = new Map<string, string>();
const storage = { getItem: (key: string) => items.get(key) ?? null,
  setItem: vi.fn((key: string, value: string) => { items.set(key, value); }) };
beforeEach(() => {
  items.clear();
  storage.setItem.mockClear();
  setScoreStorage(storage);
  start('NORMAL');
});
afterEach(() => { setScoreStorage(undefined); vi.restoreAllMocks(); });
describe('run results', () => {
  it.each(['EASY', 'NORMAL', 'INSANE'] as const)('clears %s once, caps spawning, and freezes clock and input', (mode) => {
    start(mode);
    useGameStore.setState({ health: 1000, score: 1200, maxCombo: 4 });
    const timingPoints: number[] = [];
    const unsubscribe = useGameStore.subscribe((state) => {
      for (const target of state.targets) timingPoints.push(target.startTime + target.duration);
    });
    run(16, RUN_LENGTH_MS + 1000);
    unsubscribe();
    const state = store();
    expect(state).toMatchObject({ showResults: true, showFailScreen: false, targets: [] });
    expect(state.lastRun).toMatchObject({ mode, score: 1200, accuracy: 0, maxCombo: 4,
      counts: state.counts, outcome: 'cleared', isNewBest: true });
    expect(timingPoints.length).toBeGreaterThan(0);
    expect(Math.max(...timingPoints)).toBeLessThanOrEqual(RUN_LENGTH_MS);
    expect(loadBests()[mode]).toMatchObject({ score: 1200, accuracy: 0, maxCombo: 4 });
    store().togglePause();
    store().hitAt({ x: 0, y: 0, z: 0 }, 200_000);
    run(RUN_LENGTH_MS + 1000, RUN_LENGTH_MS + 2000);
    vi.spyOn(performance, 'now').mockReturnValue(200_000);
    expect(getGameTime()).toBe(state.gameTime);
    expect(store().isPaused).toBe(false);
    expect(store().lastRun).toBe(state.lastRun);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
  it('records failures including the last miss, and never records exit or practice', () => {
    run(16, 20_000);
    expect(store().lastRun).toMatchObject({ outcome: 'failed', counts: store().counts });
    const time = store().gameTime;
    run(20_000, 21_000);
    expect(store().gameTime).toBe(time);
    expect(storage.setItem).not.toHaveBeenCalled(); // a zero score is never a best
    store().endGame();
    expect(store()).toMatchObject({ lastRun: null, showResults: false });
    start('NORMAL');
    store().endGame();
    start('PRACTICE');
    run(16, RUN_LENGTH_MS * 2);
    expect(store().gameTime).toBeGreaterThan(RUN_LENGTH_MS);
    expect(store()).toMatchObject({ lastRun: null, showResults: false });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('captures an early-tap failure and clears the result on retry', () => {
    const { target, now } = firstTarget();
    useGameStore.setState({ health: 0.1 });
    store().hitAt(target.position, now);
    expect(store().lastRun).toMatchObject({ outcome: 'failed', counts: { miss: 1 } });
    store().startGame('NORMAL');
    expect(store()).toMatchObject({ lastRun: null, showResults: false, showFailScreen: false });
  });
  it('allows the final target its late window and records its last hit', () => {
    const { target } = firstTarget();
    useGameStore.setState({ gameTime: RUN_LENGTH_MS, lastTick: RUN_LENGTH_MS,
      nextHitAt: RUN_LENGTH_MS + 800,
      targets: [{ ...target, startTime: RUN_LENGTH_MS - target.duration }] });
    store().updateGame(RUN_LENGTH_MS + 16);
    expect(store().showResults).toBe(false);
    store().hitAt(target.position, RUN_LENGTH_MS + 20);
    store().updateGame(RUN_LENGTH_MS + 32);
    expect(store().lastRun).toMatchObject({ outcome: 'cleared', score: 300, counts: { great: 1 } });
  });
});
describe('judgement counts', () => {
  it.each([
    [1, 300, 'great'],
    [0.8, 100, 'good'],
    [0.65, 50, 'meh'],
  ] as const)('records a %s timing hit as %i points', (accuracy, points, grade) => {
    let { target, now } = firstTarget();
    const previousCounts = store().counts;
    now = run(now, now + target.duration * accuracy - 16);
    store().hitAt(target.position, now + 16);
    store().hitAt(target.position, now + 16);
    expect(store().counts).toEqual({ great: 0, good: 0, meh: 0, miss: 0, [grade]: 1 });
    expect(store().targets.find((t) => t.id === target.id)).toMatchObject({ hit: true, points });
    expect(previousCounts).toEqual({ great: 0, good: 0, meh: 0, miss: 0 });
    expect([target.hit, target.points]).toEqual([false, undefined]);
  });
  it('counts an early tap once even after the target expires', () => {
    const { target, now } = firstTarget();
    store().hitAt(target.position, now);
    store().hitAt(target.position, now);
    expect(store().counts).toEqual({ great: 0, good: 0, meh: 0, miss: 1 });
    run(now, now + target.duration + 100);
    expect(store().counts.miss).toBe(1);
  });
  it('counts an expired target once without mutating previous counts', () => {
    const { target, now } = firstTarget();
    const previousCounts = store().counts;
    run(now, now + target.duration + 100);
    expect(store().counts).toEqual({ great: 0, good: 0, meh: 0, miss: 1 });
    run(now + target.duration + 100, now + target.duration + 200);
    expect(store().counts.miss).toBe(1);
    expect(previousCounts.miss).toBe(0);
  });
  it('counts the miss that fails the run', () => {
    const { target, now } = firstTarget();
    useGameStore.setState({ health: DIFFICULTY_CONFIG.NORMAL.missPenalty });
    store().hitAt(target.position, now);
    expect(store().showFailScreen).toBe(true);
    expect(store().counts.miss).toBe(1);
  });
  it('counts every target when multiple targets expire in one tick', () => {
    const { target, now } = firstTarget();
    useGameStore.setState({ targets: [target, { ...target, id: 'second-expired' }] });
    run(now, now + target.duration + 100);
    expect(store().counts).toEqual({ great: 0, good: 0, meh: 0, miss: 2 });
  });
  it('resets all counts on startGame', () => {
    useGameStore.setState({ counts: { great: 2, good: 3, meh: 4, miss: 5 } });
    store().startGame('PRACTICE');
    expect(store().counts).toEqual({ great: 0, good: 0, meh: 0, miss: 0 });
  });
});
describe('missing targets', () => {
  it('does not end the run on a single miss', () => {
    const { target, now } = firstTarget();
    run(now, now + target.duration + 100);
    expect(store()).toMatchObject({ showFailScreen: false, gameActive: true });
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
    expect(store()).toMatchObject({ showFailScreen: true, health: 0, targets: [] });
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
    expect(store()).toMatchObject({ showFailScreen: false, combo: 3 });
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
    expect(store()).toMatchObject({ score: 300, combo: 1 });
    expect(store().targets.find((t) => t.id === target.id)?.hit).toBe(true);
  });
  it('records a judgement for each hit and miss', () => {
    let { target, now } = firstTarget();
    now = run(now, now + target.duration);
    store().hitAt(target.position, now);
    expect(store().lastJudgement).toMatchObject({ kind: 'hit', points: 300, seq: 1 });
    run(now, now + 3000);
    expect(store().lastJudgement).toMatchObject({ kind: 'miss' });
    expect(store().lastJudgement!.seq).toBeGreaterThan(1);
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
    expect(store()).toMatchObject({ score: 0, combo: 0 });
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
  it('lands every timing point on the beat, one target interval apart', () => {
    for (const mode of ['EASY', 'NORMAL', 'INSANE', 'PRACTICE'] as const) {
      start(mode);
      const { tempo } = DIFFICULTY_CONFIG[mode];
      const beat = beatMs(tempo.bpm);
      const hits = new Map<string, number>();
      for (let now = 0; hits.size < 12; ) {
        useGameStore.setState({ health: 1 }); // keep the run alive; misses are expected here
        store().updateGame((now += 16));
        for (const t of store().targets) hits.set(t.id, t.startTime + t.duration);
      }
      const times = [...hits.values()];
      for (const [i, time] of times.entries()) {
        expect(Math.abs(time / beat - Math.round(time / beat))).toBeLessThan(1e-6);
        if (i > 0) expect(time - times[i - 1]).toBeCloseTo(targetIntervalMs(tempo));
      }
    }
  });
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
