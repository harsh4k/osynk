export type Best = { score: number; accuracy: number; maxCombo: number; at: string };
export type RankedMode = 'EASY' | 'NORMAL' | 'INSANE';
type Bests = Partial<Record<RankedMode, Best>>;
type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'osynk.bests.v1';
const MODES: RankedMode[] = ['EASY', 'NORMAL', 'INSANE'];
let scoreStorage: ScoreStorage | undefined;

/** Tests can inject storage without depending on a browser. Undefined restores the default. */
export function setScoreStorage(storage: ScoreStorage | undefined): void {
  scoreStorage = storage;
}

function isBest(value: unknown): value is Best {
  if (!value || typeof value !== 'object') return false;
  const best = value as Record<string, unknown>;
  return typeof best.score === 'number' && Number.isSafeInteger(best.score) && best.score >= 0
    && typeof best.accuracy === 'number' && Number.isFinite(best.accuracy)
    && best.accuracy >= 0 && best.accuracy <= 1
    && typeof best.maxCombo === 'number' && Number.isSafeInteger(best.maxCombo) && best.maxCombo >= 0
    && typeof best.at === 'string' && Number.isFinite(Date.parse(best.at))
    && new Date(best.at).toISOString() === best.at;
}

function parseBests(raw: string | null): Bests {
  try {
    const value: unknown = raw === null ? {} : JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    if (!Object.entries(value).every(([mode, best]) => MODES.includes(mode as RankedMode) && isBest(best))) return {};
    return value as Bests;
  } catch {
    return {};
  }
}

export function loadBests(storage?: Pick<Storage, 'getItem'>): Bests {
  try {
    return parseBests((storage ?? scoreStorage ?? window.localStorage).getItem(KEY));
  } catch {
    return {};
  }
}

export function recordRun(
  mode: RankedMode | 'PRACTICE',
  result: Best,
  storage?: ScoreStorage,
): { bests: Bests; isNewBest: boolean } {
  let bests: Bests = {};
  if (mode === 'PRACTICE') return { bests: loadBests(storage), isNewBest: false };
  try {
    const target = storage ?? scoreStorage ?? window.localStorage;
    bests = parseBests(target.getItem(KEY));
    // A run that scored nothing is not a record, even on an empty board.
    if (!isBest(result) || result.score === 0 || (bests[mode] && result.score <= bests[mode].score)) {
      return { bests, isNewBest: false };
    }
    const updated = { ...bests, [mode]: { ...result } };
    target.setItem(KEY, JSON.stringify(updated));
    return { bests: updated, isNewBest: true };
  } catch {
    // Private browsing and quota limits must not interrupt the game or claim a saved best.
    return { bests, isNewBest: false };
  }
}
