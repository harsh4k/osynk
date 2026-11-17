import { afterEach, describe, expect, it, vi } from 'vitest';
import { Best, loadBests, recordRun, setScoreStorage } from './highScores';

const KEY = 'osynk.bests.v1';
const result: Best = { score: 1200, accuracy: 0.98, maxCombo: 12, at: '2026-11-17T00:00:00.000Z' };
function memoryStorage(raw?: string) {
  const items = new Map(raw === undefined ? [] : [[KEY, raw]]);
  return {
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { items.set(key, value); }),
  };
}
afterEach(() => { setScoreStorage(undefined); vi.unstubAllGlobals(); });

describe('high scores', () => {
  it('loads empty storage', () => expect(loadBests(memoryStorage())).toEqual({}));
  it.each([
    '{bad', 'null', '[]', '42', '{"PRACTICE":{}}',
    JSON.stringify({ NORMAL: { ...result, score: -1 } }),
    JSON.stringify({ NORMAL: { ...result, accuracy: 2 } }),
    JSON.stringify({ NORMAL: { ...result, maxCombo: '12' } }),
    JSON.stringify({ NORMAL: { ...result, at: 'yesterday' } }),
    JSON.stringify({ NORMAL: { score: 1200 } }),
  ])('rejects corrupt JSON or invalid shape: %s', (raw) => {
    expect(loadBests(memoryStorage(raw))).toEqual({});
  });
  it('does not record a zero score as a best', () => {
    const storage = memoryStorage();
    expect(recordRun('NORMAL', { ...result, score: 0 }, storage).isNewBest).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('loads valid bests', () => {
    expect(loadBests(memoryStorage(JSON.stringify({ NORMAL: result })))).toEqual({ NORMAL: result });
  });
  it.each([1100, 1200])('does not save a lower or tied score (%i)', (score) => {
    const storage = memoryStorage(JSON.stringify({ NORMAL: result }));
    expect(recordRun('NORMAL', { ...result, score }, storage)).toEqual({ bests: { NORMAL: result }, isNewBest: false });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('saves a first and higher score, preserving other modes', () => {
    const storage = memoryStorage();
    expect(recordRun('EASY', result, storage).isNewBest).toBe(true);
    recordRun('NORMAL', result, storage);
    const higher = { ...result, score: 2400 };
    expect(recordRun('NORMAL', higher, storage)).toEqual({ bests: { EASY: result, NORMAL: higher }, isNewBest: true });
    expect(loadBests(storage)).toEqual({ EASY: result, NORMAL: higher });
  });
  it('recovers from corrupt storage on save', () => {
    const storage = memoryStorage('{bad');
    expect(recordRun('INSANE', result, storage).isNewBest).toBe(true);
    expect(loadBests(storage)).toEqual({ INSANE: result });
  });
  it('never throws when reading or writing storage fails', () => {
    const storage = memoryStorage();
    storage.getItem.mockImplementation(() => { throw new Error('private'); });
    expect(loadBests(storage)).toEqual({});
    expect(recordRun('NORMAL', result, storage)).toEqual({ bests: {}, isNewBest: false });
    expect(storage.setItem).not.toHaveBeenCalled();
    const full = memoryStorage(JSON.stringify({ NORMAL: result }));
    full.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(recordRun('NORMAL', { ...result, score: 2400 }, full)).toEqual({ bests: { NORMAL: result }, isNewBest: false });
    expect(loadBests(full)).toEqual({ NORMAL: result });
  });
  it('handles localStorage access throwing', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('denied'); } });
    expect(loadBests()).toEqual({});
    expect(recordRun('NORMAL', result)).toEqual({ bests: {}, isNewBest: false });
  });
  it('uses injected storage and never records practice', () => {
    const storage = memoryStorage();
    setScoreStorage(storage);
    expect(recordRun('PRACTICE', result)).toEqual({ bests: {}, isNewBest: false });
    expect(storage.setItem).not.toHaveBeenCalled();
    recordRun('NORMAL', result);
    expect(loadBests()).toEqual({ NORMAL: result });
  });
});
