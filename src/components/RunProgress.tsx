import { useGameStore } from '../store/useGameStore';
import { RUN_LENGTH_MS } from '../utils/gameplay';

export function RunProgress() {
  const gameTime = useGameStore((state) => state.gameTime);

  return (
    <div aria-hidden="true" className="mt-1 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
      <div className="h-full bg-white/30" style={{ width: `${Math.min(1, gameTime / RUN_LENGTH_MS) * 100}%` }} />
    </div>
  );
}
