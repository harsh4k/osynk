/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';

export type Vector3 = { x: number; y: number; z: number };

export interface Player {
  id: string;
  color: string;
  position: Vector3 | null;
}

export interface ForceField {
  id: string;
  position: Vector3;
  type: 'attractor' | 'repulsor';
  ownerId: string;
  createdAt: number;
  color: string;
}

export type DifficultyMode = 'EASY' | 'NORMAL' | 'INSANE' | 'PRACTICE';

export interface Target {
  id: string;
  position: Vector3;
  type: 'circle' | 'slider';
  startTime: number;
  duration: number;
  hit: boolean;
  missed: boolean;
  sliderPath?: Vector3[];
}

interface GameState {
  myId: string;
  myColor: string;
  forceFields: Record<string, ForceField>;
  targets: Target[];
  score: number;
  combo: number;
  maxCombo: number;
  gameActive: boolean;
  isPaused: boolean;
  showFailScreen: boolean;
  difficulty: DifficultyMode;
  addForce: (position: Vector3, type: 'attractor' | 'repulsor') => void;
  updateGame: () => void;
  hitTarget: (id: string, accuracy: number) => void;
  startGame: (mode: DifficultyMode) => void;
  togglePause: () => void;
  endGame: () => void;
  setDifficulty: (mode: DifficultyMode) => void;
}

const COLORS = [
  '#FF3366', '#33CCFF', '#FF9933', '#33FF99', 
  '#CC33FF', '#FFFF33', '#FF3333', '#3333FF'
];

const DIFFICULTY_CONFIG = {
  EASY: { spawnRate: 1500, duration: 2000 },
  NORMAL: { spawnRate: 800, duration: 1200 },
  INSANE: { spawnRate: 400, duration: 700 },
  PRACTICE: { spawnRate: 1000, duration: 1500 }
};

export const useGameStore = create<GameState>((set, get) => ({
  myId: 'local-user',
  myColor: COLORS[Math.floor(Math.random() * COLORS.length)],
  forceFields: {},
  targets: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  gameActive: false,
  isPaused: false,
  showFailScreen: false,
  difficulty: 'NORMAL',

  setDifficulty: (mode) => set({ difficulty: mode }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  endGame: () => set({ gameActive: false, isPaused: false, showFailScreen: false, targets: [] }),

  startGame: (mode) => {
    set({
      difficulty: mode,
      score: 0,
      combo: 0,
      maxCombo: 0,
      targets: [],
      gameActive: true,
      isPaused: false,
      showFailScreen: false,
      forceFields: {}
    });
  },

  addForce: (position: Vector3, type: 'attractor' | 'repulsor') => {
    const { myColor } = get();
    const id = Math.random().toString(36).substring(7);
    const force: ForceField = {
      id,
      position,
      type,
      ownerId: 'local-user',
      createdAt: Date.now(),
      color: myColor,
    };
    
    set((state) => ({
      forceFields: { ...state.forceFields, [id]: force }
    }));
  },

  hitTarget: (id, accuracy) => {
    set((state) => {
      const targetIndex = state.targets.findIndex(t => t.id === id);
      if (targetIndex === -1 || state.targets[targetIndex].hit) return state;

      const newTargets = [...state.targets];
      newTargets[targetIndex] = { ...newTargets[targetIndex], hit: true };

      let points = 50;
      if (accuracy > 0.85) points = 300;
      else if (accuracy > 0.5) points = 100;

      const newCombo = state.combo + 1;
      return {
        targets: newTargets,
        score: state.score + (points * newCombo),
        combo: newCombo,
        maxCombo: Math.max(state.maxCombo, newCombo),
      };
    });
  },

  updateGame: () => {
    const now = Date.now();
    set((state) => {
      if (!state.gameActive || state.isPaused || state.showFailScreen) return state;

      const newForces = { ...state.forceFields };
      let forcesChanged = false;
      for (const id in newForces) {
        if (now - newForces[id].createdAt > 500) {
          delete newForces[id];
          forcesChanged = true;
        }
      }

      const config = DIFFICULTY_CONFIG[state.difficulty];

      const filteredTargets = state.targets.filter(t => {
        const age = now - t.startTime;
        if (!t.hit && !t.missed && age > t.duration + 50) {
          t.missed = true;
          return true;
        }
        return age < t.duration + 400;
      });

      const lastSpawn = state.targets.length > 0 ? Math.max(...state.targets.map(t => t.startTime)) : 0;
      
      let nextTargets = filteredTargets;
      if (now - lastSpawn > config.spawnRate) {
        const id = Math.random().toString(36).substring(7);
        const type = Math.random() > 0.7 ? 'slider' : 'circle';
        
        const position = {
          x: (Math.random() - 0.5) * 18,
          y: (Math.random() - 0.5) * 10,
          z: 0
        };

        let sliderPath: Vector3[] | undefined;
        if (type === 'slider') {
          sliderPath = [
            position,
            { x: position.x + (Math.random() - 0.5) * 8, y: position.y + (Math.random() - 0.5) * 8, z: 0 }
          ];
        }

        nextTargets = [...filteredTargets, {
          id,
          position,
          type,
          startTime: now,
          duration: config.duration,
          hit: false,
          missed: false,
          sliderPath
        }];
      }

      let newCombo = state.combo;
      let shouldFail = false;
      if (state.difficulty !== 'PRACTICE' && filteredTargets.some(t => t.missed && !t.hit)) {
        newCombo = 0;
        shouldFail = true;
      }

      if (shouldFail) {
        return {
          showFailScreen: true,
          combo: 0,
          targets: [] // Clear targets on fail
        };
      }

      return { 
        forceFields: forcesChanged ? newForces : state.forceFields,
        targets: nextTargets,
        combo: newCombo
      };
    });
  }
}));
