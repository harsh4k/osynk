import { accuracyFromCounts, type JudgementCounts } from '../utils/gameplay';
import { recordRun, type Best, type RankedMode } from '../utils/highScores';

export type LastRun = Omit<Best, 'at'> & {
  mode: RankedMode | 'PRACTICE';
  counts: JudgementCounts;
  isNewBest: boolean;
  outcome: 'cleared' | 'failed';
};

interface RunState {
  difficulty: LastRun['mode'];
  score: number;
  maxCombo: number;
  counts: JudgementCounts;
}

export function finishRun(state: RunState, outcome: LastRun['outcome']): {
  showResults: boolean;
  showFailScreen: boolean;
  targets: [];
  lastRun: LastRun;
} {
  const accuracy = accuracyFromCounts(state.counts);
  const { score, maxCombo, difficulty: mode } = state;
  const { isNewBest } = recordRun(mode, { score, accuracy, maxCombo, at: new Date().toISOString() });
  return {
    showResults: outcome === 'cleared', showFailScreen: outcome === 'failed', targets: [],
    lastRun: { mode, score, accuracy, maxCombo, counts: { ...state.counts }, isNewBest, outcome },
  };
}
