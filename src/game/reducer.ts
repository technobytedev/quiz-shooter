import { levelForScore } from './difficulty';
import type { Question } from './question';
import type { Rng } from './random';
import { pointsFor } from './scoring';
import { SUBJECTS, type SubjectId } from './subjects';

export const STARTING_LIVES = 3;

export type Phase = 'ready' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  phase: Phase;
  subject: SubjectId;
  score: number;
  level: number;
  lives: number;
  question: Question | null;
  disabledChoices: string[];
  destroying: boolean;
  // A missed question's answer is on show; REVEAL_DONE brings the next question (or game over).
  revealing: boolean;
  lastPoints: number;
  nextId: number;
  // Content keys asked this run, so a subject can avoid repeats. Reset by START.
  usedKeys: string[];
  // Only ever increase (even across games) so UI effects can key off them.
  damageCount: number;
  hitCount: number;
}

export type GameAction =
  | { type: 'START'; subject: SubjectId }
  | { type: 'ANSWER'; questionId: number; value: string; progress: number }
  | { type: 'QUESTION_HIT' }
  | { type: 'REVEAL_DONE' }
  | { type: 'DESTROY_DONE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'QUIT' };

export function createInitialState(): GameState {
  return {
    phase: 'ready',
    subject: 'math',
    score: 0,
    level: 1,
    lives: STARTING_LIVES,
    question: null,
    disabledChoices: [],
    destroying: false,
    revealing: false,
    lastPoints: 0,
    nextId: 1,
    usedKeys: [],
    damageCount: 0,
    hitCount: 0,
  };
}

export function createGameReducer(rng: Rng) {
  function withNextQuestion(state: GameState): GameState {
    const question = SUBJECTS[state.subject].makeQuestion(state.level, rng, state.nextId, state.usedKeys);
    return {
      ...state,
      question,
      nextId: state.nextId + 1,
      usedKeys: [...state.usedKeys, question.key],
      disabledChoices: [],
      destroying: false,
      revealing: false,
    };
  }

  // Losing the last life doesn't end the game here: the answer is revealed first and
  // REVEAL_DONE ends it.
  function loseLife(state: GameState): GameState {
    return { ...state, lives: state.lives - 1, damageCount: state.damageCount + 1 };
  }

  // Back to a clean pre-run state, keeping what must survive across runs.
  function resetKeeping(state: GameState): GameState {
    return {
      ...createInitialState(),
      subject: state.subject,
      nextId: state.nextId,
      damageCount: state.damageCount,
      hitCount: state.hitCount,
    };
  }

  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'START':
        if (state.phase !== 'ready' && state.phase !== 'gameover') return state;
        return withNextQuestion({ ...resetKeeping(state), phase: 'playing', subject: action.subject });

      case 'ANSWER': {
        const { question } = state;
        // A tap on the previous question's buttons can be processed after that question was
        // replaced; it must not be judged against the new question.
        if (
          state.phase !== 'playing' ||
          state.destroying ||
          state.revealing ||
          !question ||
          action.questionId !== question.id ||
          state.disabledChoices.includes(action.value)
        ) {
          return state;
        }
        if (action.value === question.answer) {
          const points = pointsFor(action.progress);
          const score = state.score + points;
          return { ...state, score, level: levelForScore(score), destroying: true, lastPoints: points };
        }
        const hurt = { ...loseLife(state), disabledChoices: [...state.disabledChoices, action.value] };
        // Out of lives: show the answer before the game ends.
        return hurt.lives > 0 ? hurt : { ...hurt, revealing: true };
      }

      case 'QUESTION_HIT':
        if (state.phase !== 'playing' || state.destroying || state.revealing || !state.question) return state;
        return { ...loseLife({ ...state, hitCount: state.hitCount + 1 }), revealing: true };

      case 'REVEAL_DONE':
        // Accepted while paused too: the reveal timer keeps running if the app backgrounds.
        if ((state.phase !== 'playing' && state.phase !== 'paused') || !state.revealing) return state;
        if (state.lives > 0) return withNextQuestion(state);
        return { ...state, phase: 'gameover', question: null, disabledChoices: [], revealing: false };

      case 'DESTROY_DONE':
        // Accepted while paused too: the break animation keeps running if the app backgrounds.
        if ((state.phase !== 'playing' && state.phase !== 'paused') || !state.destroying) return state;
        return withNextQuestion(state);

      case 'PAUSE':
        return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;

      case 'RESUME':
        return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;

      case 'QUIT':
        if (state.phase !== 'paused' && state.phase !== 'gameover') return state;
        return resetKeeping(state);
    }
  };
}
