import { levelForScore } from './difficulty';
import { makeQuestion, type Question } from './questions';
import type { Rng } from './random';
import { pointsFor } from './scoring';

export const STARTING_LIVES = 3;

export type Phase = 'ready' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  phase: Phase;
  score: number;
  level: number;
  lives: number;
  question: Question | null;
  disabledChoices: number[];
  destroying: boolean;
  lastPoints: number;
  nextId: number;
  // Only ever increase (even across games) so UI effects can key off them.
  damageCount: number;
  hitCount: number;
}

export type GameAction =
  | { type: 'START' }
  | { type: 'ANSWER'; value: number; progress: number }
  | { type: 'QUESTION_HIT' }
  | { type: 'DESTROY_DONE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' };

export function createInitialState(): GameState {
  return {
    phase: 'ready',
    score: 0,
    level: 1,
    lives: STARTING_LIVES,
    question: null,
    disabledChoices: [],
    destroying: false,
    lastPoints: 0,
    nextId: 1,
    damageCount: 0,
    hitCount: 0,
  };
}

export function createGameReducer(rng: Rng) {
  function withNextQuestion(state: GameState): GameState {
    return {
      ...state,
      question: makeQuestion(state.level, rng, state.nextId),
      nextId: state.nextId + 1,
      disabledChoices: [],
      destroying: false,
    };
  }

  function loseLife(state: GameState): GameState {
    const lives = state.lives - 1;
    const hurt = { ...state, lives, damageCount: state.damageCount + 1 };
    if (lives > 0) return hurt;
    return { ...hurt, phase: 'gameover', question: null, disabledChoices: [], destroying: false };
  }

  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'START':
        if (state.phase !== 'ready' && state.phase !== 'gameover') return state;
        return withNextQuestion({
          ...createInitialState(),
          phase: 'playing',
          nextId: state.nextId,
          damageCount: state.damageCount,
          hitCount: state.hitCount,
        });

      case 'ANSWER': {
        const { question } = state;
        if (
          state.phase !== 'playing' ||
          state.destroying ||
          !question ||
          state.disabledChoices.includes(action.value)
        ) {
          return state;
        }
        if (action.value === question.answer) {
          const points = pointsFor(action.progress);
          const score = state.score + points;
          return { ...state, score, level: levelForScore(score), destroying: true, lastPoints: points };
        }
        const hurt = loseLife(state);
        if (hurt.phase === 'gameover') return hurt;
        return { ...hurt, disabledChoices: [...state.disabledChoices, action.value] };
      }

      case 'QUESTION_HIT': {
        if (state.phase !== 'playing' || state.destroying || !state.question) return state;
        const hurt = loseLife({ ...state, hitCount: state.hitCount + 1 });
        return hurt.phase === 'gameover' ? hurt : withNextQuestion(hurt);
      }

      case 'DESTROY_DONE':
        // Accepted while paused too: the break animation keeps running if the app backgrounds.
        if ((state.phase !== 'playing' && state.phase !== 'paused') || !state.destroying) return state;
        return withNextQuestion(state);

      case 'PAUSE':
        return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;

      case 'RESUME':
        return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;
    }
  };
}
