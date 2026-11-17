/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import {
  DEFAULT_PLAYFIELD,
  LATE_WINDOW_MS,
  Playfield,
  Vector3,
  findTargetAt,
  healthGainForPoints,
  hitWindow,
  pointsForAccuracy,
  randomSliderEnd,
  pickSpawnPoint,
  timingAccuracy,
} from '../utils/gameplay';
import { Tempo, firstHitTime, targetIntervalMs } from '../utils/rhythm';

export type { Vector3 } from '../utils/gameplay';

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
  /** Game time (ms) when the target appeared. */
  startTime: number;
  /** Ms from appearing to the perfect hit moment. */
  duration: number;
  hit: boolean;
  missed: boolean;
  sliderPath?: Vector3[];
}

/** The most recent hit or miss. `seq` increases on every judgement so listeners can spot new ones. */
export type Judgement =
  | { seq: number; kind: 'hit'; points: 300 | 100 | 50 }
  | { seq: number; kind: 'miss' };

interface GameState {
  myId: string;
  myColor: string;
  forceFields: Record<string, ForceField>;
  targets: Target[];
  score: number;
  combo: number;
  maxCombo: number;
  /** 0..1. The run fails when it reaches 0, except in Practice. */
  health: number;
  gameActive: boolean;
  isPaused: boolean;
  showFailScreen: boolean;
  difficulty: DifficultyMode;
  /** Ms of unpaused play since the run started. All target timing uses this clock. */
  gameTime: number;
  /** Wall-clock timestamp of the previous tick, or null before the first tick of a run. */
  lastTick: number | null;
  /** Game time of the next target's timing point. Always on the beat grid. */
  nextHitAt: number;
  playfield: Playfield;
  lastJudgement: Judgement | null;
  addForce: (position: Vector3, type: 'attractor' | 'repulsor', now?: number) => void;
  updateGame: (now?: number) => void;
  hitAt: (point: Vector3, now?: number) => void;
  startGame: (mode: DifficultyMode) => void;
  togglePause: () => void;
  endGame: () => void;
  setDifficulty: (mode: DifficultyMode) => void;
  setPlayfield: (field: Playfield) => void;
}

const COLORS = [
  '#FF3366', '#33CCFF', '#FF9933', '#33FF99',
  '#CC33FF', '#FFFF33', '#FF3333', '#3333FF'
];

/**
 * Every target's timing point lands on a beat of the generated track, so `tempo` sets the pace:
 * Easy one target every 1.33 s, Normal every 0.8 s, Insane every 0.4 s, Practice every 1 s.
 */
export const DIFFICULTY_CONFIG: Record<DifficultyMode, { tempo: Tempo; duration: number; missPenalty: number }> = {
  EASY: { tempo: { bpm: 90, beatsPerTarget: 2 }, duration: 2000, missPenalty: 0.1 },
  NORMAL: { tempo: { bpm: 150, beatsPerTarget: 2 }, duration: 1200, missPenalty: 0.15 },
  INSANE: { tempo: { bpm: 150, beatsPerTarget: 1 }, duration: 700, missPenalty: 0.2 },
  PRACTICE: { tempo: { bpm: 120, beatsPerTarget: 2 }, duration: 1500, missPenalty: 0 },
};

/** How long a missed or hit target stays in the list (for fade-out) after its timing point. */
const TARGET_LINGER_MS = 400;
/** Minimum gap before the first target appears. */
const LEAD_IN_MS = 600;
/** Longest step the game clock takes in one tick, so a stalled tab doesn't miss everything at once. */
const MAX_TICK_MS = 100;
/** Lifetime of a click ripple, in wall-clock ms. */
const FORCE_LIFETIME_MS = 500;

const newId = () => Math.random().toString(36).substring(2, 9);

const nextSeq = (state: GameState) => (state.lastJudgement?.seq ?? 0) + 1;

/**
 * Apply `count` misses: drain health, break the combo (except in Practice), fail at zero health.
 * Returns the state patch.
 */
function applyMisses(state: GameState, count: number): Partial<GameState> {
  const isPractice = state.difficulty === 'PRACTICE';
  const lastJudgement: Judgement = { seq: nextSeq(state), kind: 'miss' };
  let health = state.health - DIFFICULTY_CONFIG[state.difficulty].missPenalty * count;
  // Repeated decimal subtraction leaves values like 1e-16; treat those as empty.
  if (health < 1e-6) health = 0;

  if (!isPractice && health === 0) {
    return { health: 0, combo: 0, showFailScreen: true, targets: [], lastJudgement };
  }
  return { health, combo: isPractice ? state.combo : 0, lastJudgement };
}

/** Current game time, interpolated past the last tick so input is judged precisely. */
function gameTimeAt(state: GameState, now: number): number {
  if (state.isPaused || state.lastTick === null) return state.gameTime;
  return state.gameTime + Math.min(MAX_TICK_MS, Math.max(0, now - state.lastTick));
}

export const useGameStore = create<GameState>((set, get) => ({
  myId: 'local-user',
  myColor: COLORS[Math.floor(Math.random() * COLORS.length)],
  forceFields: {},
  targets: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  health: 1,
  gameActive: false,
  isPaused: false,
  showFailScreen: false,
  difficulty: 'NORMAL',
  gameTime: 0,
  lastTick: null,
  nextHitAt: 0,
  playfield: DEFAULT_PLAYFIELD,
  lastJudgement: null,

  setDifficulty: (mode) => set({ difficulty: mode }),

  setPlayfield: (field) => set({ playfield: field }),

  togglePause: () => set((state) => {
    if (!state.gameActive || state.showFailScreen) return state;
    return { isPaused: !state.isPaused };
  }),

  endGame: () => set({ gameActive: false, isPaused: false, showFailScreen: false, targets: [] }),

  startGame: (mode) => {
    set({
      difficulty: mode,
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: 1,
      targets: [],
      gameActive: true,
      isPaused: false,
      showFailScreen: false,
      forceFields: {},
      gameTime: 0,
      lastTick: null,
      nextHitAt: firstHitTime(DIFFICULTY_CONFIG[mode].tempo, DIFFICULTY_CONFIG[mode].duration, LEAD_IN_MS),
      lastJudgement: null,
    });
  },

  addForce: (position, type, now = performance.now()) => {
    const { myColor } = get();
    const id = newId();
    const force: ForceField = {
      id,
      position,
      type,
      ownerId: 'local-user',
      createdAt: now,
      color: myColor,
    };

    set((state) => ({
      forceFields: { ...state.forceFields, [id]: force }
    }));
  },

  hitAt: (point, now = performance.now()) => {
    set((state) => {
      if (!state.gameActive || state.isPaused || state.showFailScreen) return state;

      const time = gameTimeAt(state, now);
      // Ignore targets whose window has already closed; the next tick marks them missed.
      const live = state.targets.filter((t) => hitWindow(time - t.startTime, t.duration) !== 'late');
      const target = findTargetAt(live, point);
      if (!target) return state;

      const age = time - target.startTime;
      if (hitWindow(age, target.duration) === 'early') {
        return {
          targets: state.targets.map((t) => (t.id === target.id ? { ...t, missed: true } : t)),
          ...applyMisses(state, 1),
        };
      }

      const points = pointsForAccuracy(timingAccuracy(age, target.duration));
      const newCombo = state.combo + 1;

      return {
        targets: state.targets.map((t) => (t.id === target.id ? { ...t, hit: true } : t)),
        score: state.score + points * newCombo,
        combo: newCombo,
        maxCombo: Math.max(state.maxCombo, newCombo),
        health: Math.min(1, state.health + healthGainForPoints(points)),
        lastJudgement: { seq: nextSeq(state), kind: 'hit', points },
      };
    });
  },

  updateGame: (now = performance.now()) => {
    set((state) => {
      // Ripples run on the wall clock so they also clear on the menu.
      let forceFields = state.forceFields;
      for (const id in state.forceFields) {
        if (now - state.forceFields[id].createdAt > FORCE_LIFETIME_MS) {
          if (forceFields === state.forceFields) forceFields = { ...state.forceFields };
          delete forceFields[id];
        }
      }

      if (!state.gameActive || state.showFailScreen) {
        return forceFields === state.forceFields ? state : { forceFields };
      }

      if (state.isPaused || state.lastTick === null) {
        return { forceFields, lastTick: now };
      }

      const gameTime = state.gameTime + Math.min(MAX_TICK_MS, Math.max(0, now - state.lastTick));
      const config = DIFFICULTY_CONFIG[state.difficulty];

      let newMisses = 0;
      let changed = false;
      const kept: Target[] = [];
      for (const t of state.targets) {
        const age = gameTime - t.startTime;
        if (age >= t.duration + TARGET_LINGER_MS) {
          changed = true;
          continue;
        }
        if (!t.hit && !t.missed && age > t.duration + LATE_WINDOW_MS) {
          newMisses++;
          changed = true;
          kept.push({ ...t, missed: true });
          continue;
        }
        kept.push(t);
      }

      // Spawn each target exactly `duration` before its timing point, so the approach ring
      // closes on the beat. (A tick never exceeds MAX_TICK_MS, below every target interval,
      // so at most one target is due per tick.)
      let nextHitAt = state.nextHitAt;
      if (gameTime >= nextHitAt - config.duration) {
        const type = Math.random() > 0.7 ? 'slider' : 'circle';
        const live = kept.filter((t) => !t.hit && !t.missed).map((t) => t.position);
        const position = pickSpawnPoint(state.playfield, live);
        kept.push({
          id: newId(),
          position,
          type,
          startTime: nextHitAt - config.duration,
          duration: config.duration,
          hit: false,
          missed: false,
          sliderPath: type === 'slider' ? [position, randomSliderEnd(position, state.playfield)] : undefined,
        });
        nextHitAt += targetIntervalMs(config.tempo);
        changed = true;
      }

      const targets = changed ? kept : state.targets;

      if (newMisses === 0) {
        return { forceFields, targets, gameTime, lastTick: now, nextHitAt };
      }

      return { forceFields, targets, gameTime, lastTick: now, nextHitAt, ...applyMisses(state, newMisses) };
    });
  }
}));

/** Read the game clock outside React, e.g. inside useFrame. */
export const getGameTime = () => gameTimeAt(useGameStore.getState(), performance.now());
