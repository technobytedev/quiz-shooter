import { createRng } from '../../src/game/random';
import {
  createGameReducer,
  createInitialState,
  STARTING_LIVES,
  type GameState,
} from '../../src/game/reducer';

function start(seed = 1) {
  const reduce = createGameReducer(createRng(seed));
  return { reduce, state: reduce(createInitialState(), { type: 'START' }) };
}

function idOf(state: GameState): number {
  return state.question!.id;
}

function answerOf(state: GameState): string {
  return state.question!.answer;
}

function wrongOf(state: GameState, skip: string[] = []): string {
  return state.question!.choices.find((c) => c !== state.question!.answer && !skip.includes(c))!;
}

describe('gameReducer', () => {
  it('starts in the ready phase with no question', () => {
    expect(createInitialState()).toMatchObject({
      phase: 'ready',
      score: 0,
      level: 1,
      lives: STARTING_LIVES,
      question: null,
      destroying: false,
      damageCount: 0,
      hitCount: 0,
    });
  });

  it('START begins play with a first question', () => {
    const { state } = start();
    expect(state.phase).toBe('playing');
    expect(state.lives).toBe(3);
    expect(state.question).not.toBeNull();
  });

  it('ignores START while playing', () => {
    const { reduce, state } = start();
    expect(reduce(state, { type: 'START' })).toBe(state);
  });

  it('scores a correct answer with the speed bonus and starts destroying', () => {
    const { reduce, state } = start();
    const next = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: answerOf(state), progress: 0.1 });
    expect(next).toMatchObject({ score: 3, lastPoints: 3, destroying: true, lives: 3 });
    expect(next.question).toBe(state.question);
  });

  it('spawns a fresh question on DESTROY_DONE', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, {
      type: 'ANSWER',
      questionId: idOf(state),
      value: answerOf(state),
      progress: 0.9,
    });
    const next = reduce(destroying, { type: 'DESTROY_DONE' });
    expect(next.destroying).toBe(false);
    expect(next.disabledChoices).toEqual([]);
    expect(next.question!.id).toBeGreaterThan(state.question!.id);
  });

  it('levels up once the score crosses a threshold', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 2; i++) {
      state = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: answerOf(state), progress: 0 });
      state = reduce(state, { type: 'DESTROY_DONE' });
    }
    expect(state.score).toBe(6);
    expect(state.level).toBe(2);
  });

  it('a wrong answer costs a life, disables that choice and keeps the question', () => {
    const { reduce, state } = start();
    const wrong = wrongOf(state);
    const next = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: wrong, progress: 0.5 });
    expect(next).toMatchObject({ lives: 2, damageCount: 1, hitCount: 0, disabledChoices: [wrong] });
    expect(next.question).toBe(state.question);
  });

  it('ignores a second tap on a disabled choice', () => {
    const { reduce, state } = start();
    const wrong = wrongOf(state);
    const once = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: wrong, progress: 0.5 });
    expect(reduce(once, { type: 'ANSWER', questionId: idOf(once), value: wrong, progress: 0.6 })).toBe(once);
  });

  it('ignores answers while the break animation runs', () => {
    const { reduce, state } = start();
    const questionId = idOf(state);
    const destroying = reduce(state, { type: 'ANSWER', questionId, value: answerOf(state), progress: 0.2 });
    const correctAgain = reduce(destroying, { type: 'ANSWER', questionId, value: answerOf(state), progress: 0.2 });
    const wrongTap = reduce(destroying, { type: 'ANSWER', questionId, value: wrongOf(state), progress: 0.2 });
    expect(correctAgain).toBe(destroying);
    expect(wrongTap).toBe(destroying);
  });

  it('ignores QUESTION_HIT during the break animation', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, {
      type: 'ANSWER',
      questionId: idOf(state),
      value: answerOf(state),
      progress: 0.99,
    });
    expect(reduce(destroying, { type: 'QUESTION_HIT' })).toBe(destroying);
  });

  it('QUESTION_HIT costs a life and spawns the next question', () => {
    const { reduce, state } = start();
    const next = reduce(state, { type: 'QUESTION_HIT' });
    expect(next).toMatchObject({ lives: 2, damageCount: 1, hitCount: 1, phase: 'playing' });
    expect(next.question!.id).not.toBe(state.question!.id);
  });

  it('ignores an answer aimed at a previous question', () => {
    const { reduce, state } = start();
    const staleId = idOf(state);
    // A tap on the old buttons can be processed after the QUESTION_HIT that replaced their question.
    const next = reduce(state, { type: 'QUESTION_HIT' });
    expect(idOf(next)).not.toBe(staleId);
    // Every choice of the new question (its answer included) and of the old one.
    for (const value of [...next.question!.choices, ...state.question!.choices]) {
      expect(reduce(next, { type: 'ANSWER', questionId: staleId, value, progress: 0.5 })).toBe(next);
    }
    // The same tap aimed at the current question is judged normally.
    const judged = reduce(next, { type: 'ANSWER', questionId: idOf(next), value: answerOf(next), progress: 0.1 });
    expect(judged).toMatchObject({ destroying: true, score: 3, lives: 2 });
  });

  it('ends the game when the last life is lost to hits', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 3; i++) state = reduce(state, { type: 'QUESTION_HIT' });
    expect(state).toMatchObject({ phase: 'gameover', lives: 0, question: null, hitCount: 3 });
  });

  it('ends the game on a third wrong tap', () => {
    const { reduce, state: first } = start();
    let state = first;
    const tapped: string[] = [];
    for (let i = 0; i < 3; i++) {
      const wrong = wrongOf(state, tapped);
      tapped.push(wrong);
      state = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: wrong, progress: 0.5 });
    }
    expect(state).toMatchObject({ phase: 'gameover', lives: 0, question: null, damageCount: 3 });
  });

  it('pauses and resumes, ignoring answers while paused', () => {
    const { reduce, state } = start();
    const paused = reduce(state, { type: 'PAUSE' });
    expect(paused.phase).toBe('paused');
    const tap = { type: 'ANSWER', questionId: idOf(paused), value: answerOf(paused), progress: 0 } as const;
    expect(reduce(paused, tap)).toBe(paused);
    expect(reduce(paused, { type: 'QUESTION_HIT' })).toBe(paused);
    expect(reduce(paused, { type: 'RESUME' }).phase).toBe('playing');
  });

  it('ignores PAUSE outside of play', () => {
    const reduce = createGameReducer(createRng(1));
    const ready = createInitialState();
    expect(reduce(ready, { type: 'PAUSE' })).toBe(ready);
  });

  it('ignores RESUME unless paused', () => {
    const { reduce, state } = start();
    expect(reduce(state, { type: 'RESUME' })).toBe(state);
    const ready = createInitialState();
    expect(reduce(ready, { type: 'RESUME' })).toBe(ready);
  });

  it('ignores START while paused', () => {
    const { reduce, state } = start();
    const paused = reduce(state, { type: 'PAUSE' });
    expect(reduce(paused, { type: 'START' })).toBe(paused);
  });

  it('ignores DESTROY_DONE when nothing is being destroyed', () => {
    const { reduce, state } = start();
    expect(reduce(state, { type: 'DESTROY_DONE' })).toBe(state);
    const paused = reduce(state, { type: 'PAUSE' });
    expect(reduce(paused, { type: 'DESTROY_DONE' })).toBe(paused);
  });

  it('ignores ANSWER and QUESTION_HIT after game over', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 2; i++) state = reduce(state, { type: 'QUESTION_HIT' });
    const last = state.question!; // on screen when the last life is lost
    state = reduce(state, { type: 'QUESTION_HIT' });
    expect(state.phase).toBe('gameover');
    expect(reduce(state, { type: 'ANSWER', questionId: last.id, value: last.answer, progress: 0.5 })).toBe(state);
    expect(reduce(state, { type: 'QUESTION_HIT' })).toBe(state);
  });

  it('still spawns the next question if the break finishes while paused', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, {
      type: 'ANSWER',
      questionId: idOf(state),
      value: answerOf(state),
      progress: 0.5,
    });
    const paused = reduce(destroying, { type: 'PAUSE' });
    const next = reduce(paused, { type: 'DESTROY_DONE' });
    expect(next.phase).toBe('paused');
    expect(next.destroying).toBe(false);
    expect(next.question!.id).toBeGreaterThan(state.question!.id);
  });

  it('START after game over resets the run but keeps counters increasing', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 3; i++) state = reduce(state, { type: 'QUESTION_HIT' });
    const lastId = state.nextId;
    const again = reduce(state, { type: 'START' });
    expect(again).toMatchObject({ phase: 'playing', score: 0, level: 1, lives: 3, damageCount: 3, hitCount: 3 });
    expect(again.question!.id).toBeGreaterThanOrEqual(lastId);
  });
});
