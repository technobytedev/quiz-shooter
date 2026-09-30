import { ENGLISH_BANK } from '../../src/game/english-bank';
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
import { createRng } from '../../src/game/random';
import {
  createGameReducer,
  createInitialState,
  STARTING_LIVES,
  type GameState,
} from '../../src/game/reducer';
import { SCIENCE_BANK } from '../../src/game/science-bank';
import type { SubjectId } from '../../src/game/subjects';

type Reduce = ReturnType<typeof createGameReducer>;

function start(seed = 1, subject: SubjectId = 'math') {
  const reduce = createGameReducer(createRng(seed));
  return { reduce, state: reduce(createInitialState(), { type: 'START', subject }) };
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

// A question lands: a life is lost and its answer revealed; REVEAL_DONE moves on.
function miss(reduce: Reduce, state: GameState): GameState {
  return reduce(reduce(state, { type: 'QUESTION_HIT' }), { type: 'REVEAL_DONE' });
}

function answerCorrectly(reduce: Reduce, state: GameState, progress = 0.9): GameState {
  const hit = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: answerOf(state), progress });
  return reduce(hit, { type: 'DESTROY_DONE' });
}

describe('gameReducer', () => {
  it('starts in the ready phase with no question', () => {
    expect(createInitialState()).toMatchObject({
      phase: 'ready',
      subject: 'math',
      score: 0,
      level: 1,
      lives: STARTING_LIVES,
      question: null,
      destroying: false,
      revealing: false,
      usedKeys: [],
      damageCount: 0,
      hitCount: 0,
    });
  });

  it('START begins play with a first question in the chosen subject', () => {
    const { state } = start();
    expect(state).toMatchObject({ phase: 'playing', subject: 'math', lives: 3 });
    expect(state.question).not.toBeNull();

    const english = start(1, 'english').state;
    expect(english.subject).toBe('english');
    const source = ENGLISH_BANK.find((i) => i.id === english.question!.key);
    expect(source?.band).toBe(1);
  });

  it('START with science draws the first question from the Science bank', () => {
    const { state } = start(1, 'science');
    expect(state.subject).toBe('science');
    const source = SCIENCE_BANK.find((i) => i.id === state.question!.key);
    expect(source?.band).toBe(1);
  });

  it('START with geography draws the first question from the Geography bank', () => {
    const { state } = start(1, 'geography');
    expect(state.subject).toBe('geography');
    const source = GEOGRAPHY_BANK.find((i) => i.id === state.question!.key);
    expect(source?.band).toBe(1);
  });

  it('ignores START while playing or paused', () => {
    const { reduce, state } = start();
    expect(reduce(state, { type: 'START', subject: 'english' })).toBe(state);
    const paused = reduce(state, { type: 'PAUSE' });
    expect(reduce(paused, { type: 'START', subject: 'english' })).toBe(paused);
  });

  it('records asked questions and resets the list on START', () => {
    const { reduce, state: first } = start(2, 'english');
    expect(first.usedKeys).toEqual([first.question!.key]);
    const second = answerCorrectly(reduce, first);
    expect(second.usedKeys).toEqual([first.question!.key, second.question!.key]);

    let over = second;
    for (let i = 0; i < 3; i++) over = miss(reduce, over);
    expect(over.phase).toBe('gameover');
    const again = reduce(over, { type: 'START', subject: 'english' });
    expect(again.usedKeys).toEqual([again.question!.key]);
  });

  it('never repeats an English sentence within a run', () => {
    const { reduce, state: first } = start(4, 'english');
    let state = first;
    for (let i = 0; i < 40; i++) state = answerCorrectly(reduce, state);
    expect(new Set(state.usedKeys).size).toBe(state.usedKeys.length);
    expect(state.usedKeys).toHaveLength(41);
  });

  it('scores a correct answer with the speed bonus and starts destroying', () => {
    const { reduce, state } = start();
    const next = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: answerOf(state), progress: 0.1 });
    expect(next).toMatchObject({ score: 3, lastPoints: 3, destroying: true, lives: 3 });
    expect(next.question).toBe(state.question);
  });

  it('spawns a fresh question on DESTROY_DONE', () => {
    const { reduce, state } = start();
    const next = answerCorrectly(reduce, state);
    expect(next.destroying).toBe(false);
    expect(next.disabledChoices).toEqual([]);
    expect(next.question!.id).toBeGreaterThan(state.question!.id);
  });

  it('levels up once the score crosses a threshold', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 2; i++) state = answerCorrectly(reduce, state, 0);
    expect(state.score).toBe(6);
    expect(state.level).toBe(2);
  });

  it('a wrong answer costs a life, disables that choice and keeps the question falling', () => {
    const { reduce, state } = start();
    const wrong = wrongOf(state);
    const next = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: wrong, progress: 0.5 });
    expect(next).toMatchObject({ lives: 2, damageCount: 1, hitCount: 0, disabledChoices: [wrong], revealing: false });
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
    expect(reduce(destroying, { type: 'ANSWER', questionId, value: answerOf(state), progress: 0.2 })).toBe(destroying);
    expect(reduce(destroying, { type: 'ANSWER', questionId, value: wrongOf(state), progress: 0.2 })).toBe(destroying);
  });

  it('ignores QUESTION_HIT during the break animation', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: answerOf(state), progress: 0.99 });
    expect(reduce(destroying, { type: 'QUESTION_HIT' })).toBe(destroying);
  });

  it('QUESTION_HIT costs a life and reveals the answer', () => {
    const { reduce, state } = start();
    const hit = reduce(state, { type: 'QUESTION_HIT' });
    expect(hit).toMatchObject({ lives: 2, damageCount: 1, hitCount: 1, phase: 'playing', revealing: true });
    expect(hit.question).toBe(state.question);

    const next = reduce(hit, { type: 'REVEAL_DONE' });
    expect(next.revealing).toBe(false);
    expect(next.question!.id).toBeGreaterThan(state.question!.id);
    expect(next.lives).toBe(2);
  });

  it('ignores answers and hits while revealing', () => {
    const { reduce, state } = start();
    const revealing = reduce(state, { type: 'QUESTION_HIT' });
    const questionId = idOf(revealing);
    expect(reduce(revealing, { type: 'ANSWER', questionId, value: answerOf(revealing), progress: 1 })).toBe(revealing);
    expect(reduce(revealing, { type: 'ANSWER', questionId, value: wrongOf(revealing), progress: 1 })).toBe(revealing);
    expect(reduce(revealing, { type: 'QUESTION_HIT' })).toBe(revealing);
    expect(reduce(revealing, { type: 'DESTROY_DONE' })).toBe(revealing);
  });

  it('ignores REVEAL_DONE when nothing is being revealed', () => {
    const { reduce, state } = start();
    expect(reduce(state, { type: 'REVEAL_DONE' })).toBe(state);
    const ready = createInitialState();
    expect(reduce(ready, { type: 'REVEAL_DONE' })).toBe(ready);
  });

  it('still moves on if the reveal finishes while paused', () => {
    const { reduce, state } = start();
    const paused = reduce(reduce(state, { type: 'QUESTION_HIT' }), { type: 'PAUSE' });
    const next = reduce(paused, { type: 'REVEAL_DONE' });
    expect(next).toMatchObject({ phase: 'paused', revealing: false, lives: 2 });
    expect(next.question!.id).toBeGreaterThan(state.question!.id);

    // On the last life the paused reveal ends the game.
    let last = state;
    for (let i = 0; i < 2; i++) last = miss(reduce, last);
    const pausedLast = reduce(reduce(last, { type: 'QUESTION_HIT' }), { type: 'PAUSE' });
    expect(reduce(pausedLast, { type: 'REVEAL_DONE' })).toMatchObject({ phase: 'gameover', question: null });
  });

  it('ignores an answer aimed at a previous question', () => {
    const { reduce, state } = start();
    const staleId = idOf(state);
    // A tap on the old buttons can be processed after the question was replaced.
    const next = miss(reduce, state);
    expect(idOf(next)).not.toBe(staleId);
    for (const value of [...next.question!.choices, ...state.question!.choices]) {
      expect(reduce(next, { type: 'ANSWER', questionId: staleId, value, progress: 0.5 })).toBe(next);
    }
    const judged = reduce(next, { type: 'ANSWER', questionId: idOf(next), value: answerOf(next), progress: 0.1 });
    expect(judged).toMatchObject({ destroying: true, score: 3, lives: 2 });
  });

  it('ends the game after the reveal when the last life is lost to a hit', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 2; i++) state = miss(reduce, state);
    const lastQuestion = state.question;
    const revealing = reduce(state, { type: 'QUESTION_HIT' });
    expect(revealing).toMatchObject({ phase: 'playing', revealing: true, lives: 0, hitCount: 3 });
    expect(revealing.question).toBe(lastQuestion);
    expect(reduce(revealing, { type: 'REVEAL_DONE' })).toMatchObject({
      phase: 'gameover',
      lives: 0,
      question: null,
      revealing: false,
    });
  });

  it('a final wrong tap reveals the answer before game over', () => {
    const { reduce, state: first } = start();
    let state = first;
    const tapped: string[] = [];
    for (let i = 0; i < 3; i++) {
      const wrong = wrongOf(state, tapped);
      tapped.push(wrong);
      state = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: wrong, progress: 0.5 });
    }
    expect(state).toMatchObject({ phase: 'playing', revealing: true, lives: 0, damageCount: 3 });
    expect(state.question).toBe(first.question);
    expect([...state.disabledChoices].sort()).toEqual([...tapped].sort());
    expect(reduce(state, { type: 'REVEAL_DONE' })).toMatchObject({ phase: 'gameover', question: null });
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

  it('ignores PAUSE outside of play and RESUME unless paused', () => {
    const reduce = createGameReducer(createRng(1));
    const ready = createInitialState();
    expect(reduce(ready, { type: 'PAUSE' })).toBe(ready);
    expect(reduce(ready, { type: 'RESUME' })).toBe(ready);
    const { state } = start();
    expect(reduce(state, { type: 'RESUME' })).toBe(state);
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
    for (let i = 0; i < 2; i++) state = miss(reduce, state);
    const last = state.question!;
    state = miss(reduce, state);
    expect(state.phase).toBe('gameover');
    expect(reduce(state, { type: 'ANSWER', questionId: last.id, value: last.answer, progress: 0.5 })).toBe(state);
    expect(reduce(state, { type: 'QUESTION_HIT' })).toBe(state);
  });

  it('still spawns the next question if the break finishes while paused', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, { type: 'ANSWER', questionId: idOf(state), value: answerOf(state), progress: 0.5 });
    const next = reduce(reduce(destroying, { type: 'PAUSE' }), { type: 'DESTROY_DONE' });
    expect(next.phase).toBe('paused');
    expect(next.destroying).toBe(false);
    expect(next.question!.id).toBeGreaterThan(state.question!.id);
  });

  it('START after game over resets the run, can switch subject, and keeps counters increasing', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 3; i++) state = miss(reduce, state);
    const lastId = state.nextId;
    const again = reduce(state, { type: 'START', subject: 'english' });
    expect(again).toMatchObject({
      phase: 'playing',
      subject: 'english',
      score: 0,
      level: 1,
      lives: 3,
      damageCount: 3,
      hitCount: 3,
    });
    expect(again.question!.id).toBeGreaterThanOrEqual(lastId);
  });

  it('QUIT works during a reveal and is ignored elsewhere', () => {
    const { reduce, state } = start(1, 'english');
    // From pause (here mid-reveal) back to the subject picker; the run's score is reset.
    const scored = answerCorrectly(reduce, state, 0);
    const pausedReveal = reduce(reduce(scored, { type: 'QUESTION_HIT' }), { type: 'PAUSE' });
    const quit = reduce(pausedReveal, { type: 'QUIT' });
    expect(quit).toMatchObject({
      phase: 'ready',
      subject: 'english',
      question: null,
      revealing: false,
      destroying: false,
      score: 0,
      level: 1,
      lives: 3,
      damageCount: pausedReveal.damageCount,
      hitCount: pausedReveal.hitCount,
      nextId: pausedReveal.nextId,
    });

    // From game over.
    let over = state;
    for (let i = 0; i < 3; i++) over = miss(reduce, over);
    expect(reduce(over, { type: 'QUIT' }).phase).toBe('ready');

    // Ignored while playing or already ready.
    expect(reduce(state, { type: 'QUIT' })).toBe(state);
    const ready = createInitialState();
    expect(reduce(ready, { type: 'QUIT' })).toBe(ready);
  });
});
