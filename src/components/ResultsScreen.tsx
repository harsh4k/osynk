import { useMemo, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import type { LastRun } from '../store/useGameStore';
import { loadBests } from '../utils/highScores';

interface ResultsScreenProps {
  result: LastRun;
  onRetry: () => void;
  onMenu: () => void;
}

export function ResultsScreen({ result, onRetry, onMenu }: ResultsScreenProps) {
  const retryRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const bests = useMemo(() => loadBests(), [result]);
  const best = result.mode === 'PRACTICE' ? undefined : bests[result.mode];
  const failed = result.outcome === 'failed';
  const grades = [
    { label: '300', count: result.counts.great, color: 'text-sky-300' },
    { label: '100', count: result.counts.good, color: 'text-green-400' },
    { label: '50', count: result.counts.meh, color: 'text-amber-400' },
    { label: 'Miss', count: result.counts.miss, color: 'text-red-500' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      onKeyDown={(event) => {
        // Keep game tap keys from cancelling native button activation on this screen.
        event.stopPropagation();
        if (event.key === 'Escape') onMenu();
        if (event.key !== 'Tab') return;
        if (event.shiftKey && document.activeElement === retryRef.current) {
          event.preventDefault();
          menuRef.current?.focus();
        } else if (!event.shiftKey && document.activeElement === menuRef.current) {
          event.preventDefault();
          retryRef.current?.focus();
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
      className={`absolute inset-0 z-50 overflow-y-auto p-4 flex pointer-events-auto backdrop-blur-md ${failed ? 'bg-red-950/40' : 'bg-zinc-950/60'}`}
    >
      <div className={`m-auto w-full max-w-md bg-zinc-900 p-6 sm:p-12 rounded-[2rem] border shadow-2xl text-center space-y-6 ${failed ? 'border-red-500/20' : 'border-white/10'}`}>
        <div className="space-y-2">
          <p className="text-zinc-400 font-mono text-xs tracking-widest">{result.mode}</p>
          <h2 id="results-title" className={`text-4xl sm:text-5xl font-black italic uppercase tracking-tighter font-display ${failed ? 'text-red-500' : 'bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500'}`}>
            {failed ? 'FAILED' : 'CLEARED'}
          </h2>
        </div>
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Score</p>
          <p className="text-4xl sm:text-5xl font-black font-mono tabular-nums break-all">{result.score.toLocaleString()}</p>
          {result.isNewBest ? (
            <span className="inline-block mt-2 rounded-full border border-sky-300/30 px-3 py-1 text-xs font-bold text-sky-300">New best</span>
          ) : best ? (
            <p className="mt-2 text-sm text-zinc-400 tabular-nums">Best: {best.score.toLocaleString()}</p>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-4 font-mono">
          <div><dt className="text-xs text-zinc-400">Accuracy</dt><dd className="text-xl tabular-nums">{(result.accuracy * 100).toFixed(2)}%</dd></div>
          <div><dt className="text-xs text-zinc-400">Max combo</dt><dd className="text-xl tabular-nums">{result.maxCombo.toLocaleString()}</dd></div>
        </dl>
        <dl className="grid grid-cols-4 gap-2 border-y border-white/10 py-4 font-mono">
          {grades.map(({ label, count, color }) => (
            <div key={label} className={color}>
              <dt className="text-xs font-bold">{label}</dt>
              <dd className="text-lg tabular-nums">{count}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3">
          <button
            ref={retryRef}
            autoFocus
            onClick={onRetry}
            className="flex items-center justify-center gap-3 w-full h-14 bg-white text-black rounded-2xl font-black text-lg uppercase italic hover:bg-zinc-200 active:bg-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} aria-hidden /> Retry
          </button>
          <button
            ref={menuRef}
            onClick={onMenu}
            className="w-full h-12 bg-zinc-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-700 active:bg-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors disabled:opacity-50"
          >
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
