/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { pauseAudio, playFail, playHit, playMiss, resumeAudio, stopTrack } from './engine';

/**
 * Plays sound effects and follows pause/fail/exit by watching the store.
 * Starting the track happens in the click handler, because browsers only allow audio after a gesture.
 */
export function useGameAudio() {
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.isPaused !== prev.isPaused) {
        if (state.isPaused) pauseAudio();
        else resumeAudio(state.gameTime);
      }

      const j = state.lastJudgement;
      if (j && j.seq !== prev.lastJudgement?.seq) {
        if (j.kind === 'hit') playHit(j.points);
        else if (!state.showFailScreen) playMiss();
      }

      if (state.showFailScreen && !prev.showFailScreen) {
        stopTrack();
        playFail();
      } else if (!state.gameActive && prev.gameActive) {
        stopTrack();
      }
    });

    return unsubscribe;
  }, []);
}
