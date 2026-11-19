import { expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

it('does not charge paused time when the browser stops running ticks', () => {
  const game = useGameStore.getState();
  game.startGame('NORMAL');
  game.updateGame(0);
  game.updateGame(100);
  game.togglePause();
  game.togglePause();
  game.updateGame(10_000);
  expect(useGameStore.getState().gameTime).toBe(100);
  game.updateGame(10_016);
  expect(useGameStore.getState().gameTime).toBe(116);
});
