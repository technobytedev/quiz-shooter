# Quiz Shooter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expo template with a single-screen math shooter. One question falls toward the hero; tapping the right answer shoots it down. There are 3 lives, difficulty ramps with score, and the best score is persisted.

**Architecture:** All game rules live in pure TypeScript modules under `src/game/` (RNG, difficulty, question generation, scoring, reducer), unit-tested with jest-expo. React components under `src/components/game/` render state from a `useReducer` and only animate. Reanimated drives the fall, bullet and shatter on the UI thread and reports back via `scheduleOnRN`.

**Tech Stack:** Expo SDK 57, Expo Router, React 19.2, React Native 0.86, react-native-reanimated 4.5, react-native-worklets 0.10, expo-haptics, @react-native-async-storage/async-storage (v2 API), jest-expo.

**Spec:** `docs/superpowers/specs/2026-09-29-quiz-shooter-design.md`

## Global Constraints

- Install packages only with `npx expo install <pkg>`. On Windows, dev deps use `npx expo install <pkgs> -- --dev`.
- No native dependency that is missing from Expo Go. Allowed new packages: `expo-haptics`, `@react-native-async-storage/async-storage`, and dev-only `jest-expo`, `jest`, `@types/jest`.
- `src/game/**` must not import React, React Native, or Expo modules.
- Routes live only in `src/app/`. Non-route code lives outside it.
- Tests live in `__tests__/` at the repo root, named `*-test.ts`, and import source via relative paths (`../../src/game/...`).
- The screen is always dark regardless of system theme. Portrait only.
- Operators display as `+`, `−`, `×`, `÷` (the minus is U+2212).
- Best-score AsyncStorage key: `quiz-shooter:best-score`.
- Done means `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor`, and `npm test` all pass.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **App backgrounded during the break animation.** The shatter finishes while paused, so `DESTROY_DONE` arrives in `paused`. The next question must still spawn (and stay frozen), not deadlock. The test is in Task 3, "still spawns the next question if the break finishes while paused".
2. **Double-tap on the correct answer, or a hit landing at the same moment as a correct tap.** Only one scoring event may happen, and `QUESTION_HIT` during the break must be ignored. The tests are in Task 3, "ignores answers while the break animation runs" and "ignores QUESTION_HIT during the break animation".
3. **Tapping the same wrong answer twice.** Only one life may be lost. The test is in Task 3, "ignores a second tap on a disabled choice".
4. **Answer of 0 (e.g. `7 − 7`) or 1.** There must still be 4 distinct non-negative choices. The test is in Task 2, "makeChoices handles small answers".
5. **Very long runs (score 1000+).** The fall time floors at 2500 ms, and questions stay valid integers. The tests are in Task 1 (`levelForScore(1000)`, `configForLevel(100)`) and Task 2 (levels 1–12 sweep).

## Deviations from spec (intentional, small)

- `GameState` gains `damageCount` (every life lost, which drives the heavy haptic) and `hitCount` (question reached the hero, which drives the screen shake and hero flash). Both only increase, across games, so effects keyed on them never misfire on restart.
- `DESTROY_DONE` is accepted in `paused` as well as `playing` (Review Focus #1).

## File Map

| File | Responsibility |
|---|---|
| `src/game/random.ts` | Seedable RNG + `randInt`, `pick`, `shuffle` |
| `src/game/difficulty.ts` | `Operator` type, `levelForScore`, `configForLevel` |
| `src/game/questions.ts` | `Question` type, `OPERATOR_SYMBOL`, `makeQuestion`, `makeChoices` |
| `src/game/scoring.ts` | `pointsFor(progress)` |
| `src/game/reducer.ts` | `GameState`, `GameAction`, `createInitialState`, `createGameReducer` |
| `src/hooks/use-best-score.ts` | Load/save the best score |
| `src/components/game/colors.ts` | Palette |
| `src/components/game/layout.ts` | Shared size constants |
| `src/components/game/starfield.tsx` | Drifting star background |
| `src/components/game/hud.tsx` | Lives, level, score, pause |
| `src/components/game/answer-pad.tsx` | 2×2 answer buttons |
| `src/components/game/overlay.tsx` | Start / paused / game-over panels |
| `src/components/game/hero.tsx` | Ship, gun, muzzle flash, damage flash |
| `src/components/game/falling-question.tsx` | Card fall, bullet, shatter |
| `src/components/game/game-screen.tsx` | Wires everything together |
| `src/app/_layout.tsx` | Stack root, light status bar |
| `src/app/index.tsx` | Renders `GameScreen` |

---

### Task 1: Test tooling, RNG and difficulty

**Files:**
- Modify: `package.json` (deps, `test` script, `jest` block)
- Create: `src/game/random.ts`, `src/game/difficulty.ts`
- Test: `__tests__/game/random-test.ts`, `__tests__/game/difficulty-test.ts`
- Create (generated): `eslint.config.js` from first `npx expo lint` run

**Interfaces:**
- Produces:
  - `type Rng = () => number` (values in `[0, 1)`)
  - `createRng(seed: number): Rng`
  - `randInt(rng: Rng, min: number, max: number): number` (inclusive)
  - `pick<T>(rng: Rng, items: readonly T[]): T`
  - `shuffle<T>(rng: Rng, items: readonly T[]): T[]` (new array)
  - `type Operator = '+' | '-' | '×' | '÷'`
  - `interface Range { min: number; max: number }`
  - `interface LevelConfig { level: number; operators: Operator[]; addSub: Range; mul: Range; divQuotient: Range; divDivisor: Range; fallMs: number }`
  - `levelForScore(score: number): number`
  - `configForLevel(level: number): LevelConfig`

- [ ] **Step 1: Install test tooling and set up lint**

```bash
npx expo install jest-expo jest @types/jest -- --dev
npx expo lint
```

The first `expo lint` run offers to install `eslint-config-expo` and create `eslint.config.js`. Accept it. Expect lint to pass on the template.

Then edit `package.json`: add `"test": "jest"` to `scripts`, and add a top-level `jest` block:

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 2: Write failing tests**

`__tests__/game/random-test.ts`:

```ts
import { createRng, pick, randInt, shuffle } from '../../src/game/random';

describe('createRng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('returns values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt', () => {
  it('stays within inclusive bounds and reaches both ends', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });
});

describe('pick and shuffle', () => {
  it('pick returns an element of the list', () => {
    const rng = createRng(9);
    for (let i = 0; i < 50; i++) {
      expect(['a', 'b', 'c']).toContain(pick(rng, ['a', 'b', 'c']));
    }
  });

  it('shuffle keeps the same elements and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(createRng(11), input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
```

`__tests__/game/difficulty-test.ts`:

```ts
import { configForLevel, levelForScore } from '../../src/game/difficulty';

describe('levelForScore', () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [19, 3],
    [20, 4],
    [29, 4],
    [30, 5],
    [39, 5],
    [40, 6],
    [1000, 102],
  ])('score %i is level %i', (score, level) => {
    expect(levelForScore(score)).toBe(level);
  });
});

describe('configForLevel', () => {
  it.each([
    [1, ['+']],
    [2, ['+', '-']],
    [3, ['+', '-', '×']],
    [4, ['+', '-', '×', '÷']],
    [9, ['+', '-', '×', '÷']],
  ])('level %i allows %j', (level, operators) => {
    expect(configForLevel(level as number).operators).toEqual(operators);
  });

  it.each([
    [1, 8000],
    [2, 7000],
    [3, 6000],
    [4, 5000],
    [5, 4600],
    [10, 2600],
    [11, 2500],
    [100, 2500],
  ])('level %i falls in %i ms', (level, fallMs) => {
    expect(configForLevel(level).fallMs).toBe(fallMs);
  });

  it('uses the spec ranges', () => {
    expect(configForLevel(1).addSub).toEqual({ min: 1, max: 10 });
    expect(configForLevel(2).addSub).toEqual({ min: 1, max: 20 });
    expect(configForLevel(3).mul).toEqual({ min: 2, max: 10 });
    expect(configForLevel(4)).toMatchObject({
      addSub: { min: 1, max: 50 },
      mul: { min: 2, max: 12 },
      divQuotient: { min: 2, max: 10 },
      divDivisor: { min: 2, max: 10 },
    });
    expect(configForLevel(5)).toMatchObject({
      addSub: { min: 1, max: 75 },
      mul: { min: 2, max: 13 },
      divQuotient: { min: 2, max: 11 },
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- __tests__/game`
Expected: FAIL with "Cannot find module '../../src/game/random'" (and difficulty).

- [ ] **Step 4: Implement**

`src/game/random.ts`:

```ts
export type Rng = () => number;

// mulberry32: tiny, fast, good enough for games, and seedable for tests.
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

`src/game/difficulty.ts`:

```ts
export type Operator = '+' | '-' | '×' | '÷';

export interface Range {
  min: number;
  max: number;
}

export interface LevelConfig {
  level: number;
  operators: Operator[];
  addSub: Range;
  mul: Range;
  divQuotient: Range;
  divDivisor: Range;
  fallMs: number;
}

const MIN_FALL_MS = 2500;

export function levelForScore(score: number): number {
  if (score < 5) return 1;
  if (score < 10) return 2;
  if (score < 20) return 3;
  if (score < 30) return 4;
  return 5 + Math.floor((score - 30) / 10);
}

export function configForLevel(level: number): LevelConfig {
  const base = {
    level,
    mul: { min: 2, max: 10 },
    divQuotient: { min: 2, max: 10 },
    divDivisor: { min: 2, max: 10 },
  };
  switch (level) {
    case 1:
      return { ...base, operators: ['+'], addSub: { min: 1, max: 10 }, fallMs: 8000 };
    case 2:
      return { ...base, operators: ['+', '-'], addSub: { min: 1, max: 20 }, fallMs: 7000 };
    case 3:
      return { ...base, operators: ['+', '-', '×'], addSub: { min: 1, max: 20 }, fallMs: 6000 };
  }
  const k = level - 4;
  return {
    ...base,
    operators: ['+', '-', '×', '÷'],
    addSub: { min: 1, max: 50 + 25 * k },
    mul: { min: 2, max: 12 + k },
    divQuotient: { min: 2, max: 10 + k },
    fallMs: Math.max(MIN_FALL_MS, 5000 - 400 * k),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/game`
Expected: PASS (all random + difficulty tests).

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npx tsc --noEmit
npx expo lint
git add package.json package-lock.json eslint.config.js src/game __tests__
git commit -m "feat(game): add seedable RNG and difficulty curve with jest setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Question generation and scoring

**Files:**
- Create: `src/game/questions.ts`, `src/game/scoring.ts`
- Test: `__tests__/game/questions-test.ts`, `__tests__/game/scoring-test.ts`

**Interfaces:**
- Consumes: `Rng`, `randInt`, `pick`, `shuffle` from `src/game/random.ts`; `Operator`, `configForLevel` from `src/game/difficulty.ts`
- Produces:
  - `interface Question { id: number; text: string; answer: number; choices: number[] }`
  - `OPERATOR_SYMBOL: Record<Operator, string>` (`'-'` → `'−'`)
  - `makeQuestion(level: number, rng: Rng, id: number): Question`
  - `makeChoices(answer: number, rng: Rng): number[]` (length 4, shuffled)
  - `pointsFor(progress: number): number` (1–3)

- [ ] **Step 1: Write failing tests**

`__tests__/game/questions-test.ts`:

```ts
import { configForLevel } from '../../src/game/difficulty';
import { makeChoices, makeQuestion, OPERATOR_SYMBOL } from '../../src/game/questions';
import { createRng } from '../../src/game/random';

const EVAL: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => a / b,
};

function expectValidChoices(choices: number[], answer: number) {
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);
  expect(choices.filter((c) => c === answer)).toHaveLength(1);
  for (const c of choices) {
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(0);
  }
}

describe('makeQuestion', () => {
  it('produces valid questions across levels 1-12', () => {
    for (let level = 1; level <= 12; level++) {
      const allowed = configForLevel(level).operators.map((op) => OPERATOR_SYMBOL[op]);
      for (let seed = 1; seed <= 200; seed++) {
        const q = makeQuestion(level, createRng(seed * 31 + level), 7);
        const [a, op, b] = q.text.split(' ');
        expect(q.id).toBe(7);
        expect(allowed).toContain(op);
        expect(EVAL[op](Number(a), Number(b))).toBe(q.answer);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expectValidChoices(q.choices, q.answer);
      }
    }
  });

  it('only uses addition at level 1', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(makeQuestion(1, createRng(seed), 1).text).toContain('+');
    }
  });

  it('eventually produces every operator at level 4', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      seen.add(makeQuestion(4, createRng(seed), 1).text.split(' ')[1]);
    }
    expect([...seen].sort()).toEqual(['+', '×', '÷', '−'].sort());
  });
});

describe('makeChoices', () => {
  it('makeChoices handles small answers', () => {
    for (const answer of [0, 1, 2]) {
      for (let seed = 1; seed <= 100; seed++) {
        expectValidChoices(makeChoices(answer, createRng(seed)), answer);
      }
    }
  });

  it('keeps distractors near the answer', () => {
    for (const answer of [5, 19, 20, 21, 100, 500]) {
      for (let seed = 1; seed <= 100; seed++) {
        const choices = makeChoices(answer, createRng(seed));
        expectValidChoices(choices, answer);
        for (const c of choices) {
          expect(Math.abs(c - answer)).toBeLessThanOrEqual(answer >= 20 ? 10 : 3);
        }
      }
    }
  });

  it('sometimes uses a ±10 distractor for answers ≥ 20', () => {
    const hasTen = Array.from({ length: 100 }, (_, seed) =>
      makeChoices(50, createRng(seed + 1)).some((c) => c === 40 || c === 60),
    );
    expect(hasTen).toContain(true);
  });

  it('does not always put the answer first', () => {
    const positions = new Set(
      Array.from({ length: 50 }, (_, seed) => makeChoices(10, createRng(seed + 1)).indexOf(10)),
    );
    expect(positions.size).toBeGreaterThan(1);
  });
});
```

`__tests__/game/scoring-test.ts`:

```ts
import { pointsFor } from '../../src/game/scoring';

describe('pointsFor', () => {
  it.each([
    [0, 3],
    [0.33, 3],
    [1 / 3, 2],
    [0.5, 2],
    [2 / 3, 1],
    [0.99, 1],
    [1, 1],
  ])('progress %f earns %i', (progress, points) => {
    expect(pointsFor(progress)).toBe(points);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/game/questions-test.ts __tests__/game/scoring-test.ts`
Expected: FAIL with "Cannot find module '../../src/game/questions'" / `scoring`.

- [ ] **Step 3: Implement**

`src/game/questions.ts`:

```ts
import { configForLevel, type Operator } from './difficulty';
import { pick, randInt, shuffle, type Rng } from './random';

export interface Question {
  id: number;
  text: string;
  answer: number;
  choices: number[];
}

export const OPERATOR_SYMBOL: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '×': '×',
  '÷': '÷',
};

const SMALL_OFFSETS = [-3, -2, -1, 1, 2, 3];
const LARGE_OFFSETS = [-10, 10];

export function makeQuestion(level: number, rng: Rng, id: number): Question {
  const config = configForLevel(level);
  const op = pick(rng, config.operators);
  let a: number;
  let b: number;
  let answer: number;

  switch (op) {
    case '+':
      a = randInt(rng, config.addSub.min, config.addSub.max);
      b = randInt(rng, config.addSub.min, config.addSub.max);
      answer = a + b;
      break;
    case '-': {
      const x = randInt(rng, config.addSub.min, config.addSub.max);
      const y = randInt(rng, config.addSub.min, config.addSub.max);
      a = Math.max(x, y);
      b = Math.min(x, y);
      answer = a - b;
      break;
    }
    case '×':
      a = randInt(rng, config.mul.min, config.mul.max);
      b = randInt(rng, config.mul.min, config.mul.max);
      answer = a * b;
      break;
    case '÷':
      // Built backwards so the division is always exact.
      answer = randInt(rng, config.divQuotient.min, config.divQuotient.max);
      b = randInt(rng, config.divDivisor.min, config.divDivisor.max);
      a = answer * b;
      break;
  }

  return { id, text: `${a} ${OPERATOR_SYMBOL[op]} ${b}`, answer, choices: makeChoices(answer, rng) };
}

export function makeChoices(answer: number, rng: Rng): number[] {
  const offsets = answer >= 20 ? [...SMALL_OFFSETS, ...LARGE_OFFSETS] : SMALL_OFFSETS;
  // At least three positive small offsets always survive the filter, so this never runs short.
  const distractors = shuffle(rng, offsets)
    .map((offset) => answer + offset)
    .filter((value) => value >= 0)
    .slice(0, 3);
  return shuffle(rng, [answer, ...distractors]);
}
```

`src/game/scoring.ts`:

```ts
// progress: 0 = question just appeared at the top, 1 = it reached the hero.
export function pointsFor(progress: number): number {
  if (progress < 1 / 3) return 3;
  if (progress < 2 / 3) return 2;
  return 1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/game`
Expected: PASS (all game tests so far).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit
npx expo lint
git add src/game __tests__/game
git commit -m "feat(game): generate math questions with near-miss choices and speed scoring

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Game reducer

**Files:**
- Create: `src/game/reducer.ts`
- Test: `__tests__/game/reducer-test.ts`

**Interfaces:**
- Consumes: `levelForScore` (difficulty), `makeQuestion`, `Question` (questions), `Rng` (random), `pointsFor` (scoring)
- Produces:
  - `STARTING_LIVES = 3`
  - `type Phase = 'ready' | 'playing' | 'paused' | 'gameover'`
  - `interface GameState { phase: Phase; score: number; level: number; lives: number; question: Question | null; disabledChoices: number[]; destroying: boolean; lastPoints: number; nextId: number; damageCount: number; hitCount: number }`
  - `type GameAction = { type: 'START' } | { type: 'ANSWER'; value: number; progress: number } | { type: 'QUESTION_HIT' } | { type: 'DESTROY_DONE' } | { type: 'PAUSE' } | { type: 'RESUME' }`
  - `createInitialState(): GameState`
  - `createGameReducer(rng: Rng): (state: GameState, action: GameAction) => GameState`
  - Ignored actions return the **same object** (reference-equal).

- [ ] **Step 1: Write failing tests**

`__tests__/game/reducer-test.ts`:

```ts
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

function answerOf(state: GameState): number {
  return state.question!.answer;
}

function wrongOf(state: GameState, skip: number[] = []): number {
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
    const next = reduce(state, { type: 'ANSWER', value: answerOf(state), progress: 0.1 });
    expect(next).toMatchObject({ score: 3, lastPoints: 3, destroying: true, lives: 3 });
    expect(next.question).toBe(state.question);
  });

  it('spawns a fresh question on DESTROY_DONE', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, { type: 'ANSWER', value: answerOf(state), progress: 0.9 });
    const next = reduce(destroying, { type: 'DESTROY_DONE' });
    expect(next.destroying).toBe(false);
    expect(next.disabledChoices).toEqual([]);
    expect(next.question!.id).toBeGreaterThan(state.question!.id);
  });

  it('levels up once the score crosses a threshold', () => {
    const { reduce, state: first } = start();
    let state = first;
    for (let i = 0; i < 2; i++) {
      state = reduce(state, { type: 'ANSWER', value: answerOf(state), progress: 0 });
      state = reduce(state, { type: 'DESTROY_DONE' });
    }
    expect(state.score).toBe(6);
    expect(state.level).toBe(2);
  });

  it('a wrong answer costs a life, disables that choice and keeps the question', () => {
    const { reduce, state } = start();
    const wrong = wrongOf(state);
    const next = reduce(state, { type: 'ANSWER', value: wrong, progress: 0.5 });
    expect(next).toMatchObject({ lives: 2, damageCount: 1, hitCount: 0, disabledChoices: [wrong] });
    expect(next.question).toBe(state.question);
  });

  it('ignores a second tap on a disabled choice', () => {
    const { reduce, state } = start();
    const wrong = wrongOf(state);
    const once = reduce(state, { type: 'ANSWER', value: wrong, progress: 0.5 });
    expect(reduce(once, { type: 'ANSWER', value: wrong, progress: 0.6 })).toBe(once);
  });

  it('ignores answers while the break animation runs', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, { type: 'ANSWER', value: answerOf(state), progress: 0.2 });
    expect(reduce(destroying, { type: 'ANSWER', value: answerOf(state), progress: 0.2 })).toBe(destroying);
    expect(reduce(destroying, { type: 'ANSWER', value: wrongOf(state), progress: 0.2 })).toBe(destroying);
  });

  it('ignores QUESTION_HIT during the break animation', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, { type: 'ANSWER', value: answerOf(state), progress: 0.99 });
    expect(reduce(destroying, { type: 'QUESTION_HIT' })).toBe(destroying);
  });

  it('QUESTION_HIT costs a life and spawns the next question', () => {
    const { reduce, state } = start();
    const next = reduce(state, { type: 'QUESTION_HIT' });
    expect(next).toMatchObject({ lives: 2, damageCount: 1, hitCount: 1, phase: 'playing' });
    expect(next.question!.id).not.toBe(state.question!.id);
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
    const tapped: number[] = [];
    for (let i = 0; i < 3; i++) {
      const wrong = wrongOf(state, tapped);
      tapped.push(wrong);
      state = reduce(state, { type: 'ANSWER', value: wrong, progress: 0.5 });
    }
    expect(state).toMatchObject({ phase: 'gameover', lives: 0, question: null, damageCount: 3 });
  });

  it('pauses and resumes, ignoring answers while paused', () => {
    const { reduce, state } = start();
    const paused = reduce(state, { type: 'PAUSE' });
    expect(paused.phase).toBe('paused');
    expect(reduce(paused, { type: 'ANSWER', value: answerOf(state), progress: 0 })).toBe(paused);
    expect(reduce(paused, { type: 'QUESTION_HIT' })).toBe(paused);
    expect(reduce(paused, { type: 'RESUME' }).phase).toBe('playing');
  });

  it('ignores PAUSE outside of play', () => {
    const reduce = createGameReducer(createRng(1));
    const ready = createInitialState();
    expect(reduce(ready, { type: 'PAUSE' })).toBe(ready);
  });

  it('still spawns the next question if the break finishes while paused', () => {
    const { reduce, state } = start();
    const destroying = reduce(state, { type: 'ANSWER', value: answerOf(state), progress: 0.5 });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/game/reducer-test.ts`
Expected: FAIL with "Cannot find module '../../src/game/reducer'".

- [ ] **Step 3: Implement**

`src/game/reducer.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit
npx expo lint
git add src/game/reducer.ts __tests__/game/reducer-test.ts
git commit -m "feat(game): add game state reducer with lives, levels and pause

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Replace the template with the game shell (HUD, answers, overlays, best score)

The deliverable is a dark single screen. Play starts a run, the HUD shows lives, level and score, wrong taps cost lives, and game over shows the saved best score. The question card is static in this task. A correct answer will leave the game "destroying" (answers locked) until Task 5 adds the animations that finish it. That's expected here.

**Files:**
- Delete: `src/app/explore.tsx`, `src/components/animated-icon.module.css`, `src/components/animated-icon.tsx`, `src/components/animated-icon.web.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`, `src/components/external-link.tsx`, `src/components/hint-row.tsx`, `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/components/ui/collapsible.tsx`, `src/components/web-badge.tsx`, `src/constants/theme.ts`, `src/global.css`, `src/hooks/use-color-scheme.ts`, `src/hooks/use-color-scheme.web.ts`, `src/hooks/use-theme.ts`
- Modify: `src/app/_layout.tsx` (full rewrite), `src/app/index.tsx` (full rewrite), `app.json` (`userInterfaceStyle`)
- Create: `src/hooks/use-best-score.ts`, `src/components/game/colors.ts`, `src/components/game/layout.ts`, `src/components/game/starfield.tsx`, `src/components/game/hud.tsx`, `src/components/game/answer-pad.tsx`, `src/components/game/overlay.tsx`, `src/components/game/game-screen.tsx`

**Interfaces:**
- Consumes: everything from `src/game/*` (Tasks 1–3)
- Produces (used by Task 5):
  - `GameColors` (const object, keys below)
  - `HERO_HEIGHT = 76`, `CARD_WIDTH = 168`, `CARD_HEIGHT = 64` from `layout.ts`
  - `useBestScore(): { best: number; submit: (score: number) => void }`
  - `Hud({ lives, level, score, canPause, onPause })`
  - `AnswerPad({ questionId, choices, disabledChoices, locked, onAnswer })`
  - `Overlay({ phase, score, best, isNewBest, onStart, onResume })`
  - `Starfield()`
  - `GameScreen()` (rewritten in Task 5)

- [ ] **Step 1: Install runtime deps**

```bash
npx expo install expo-haptics @react-native-async-storage/async-storage
```

- [ ] **Step 2: Delete template files**

```bash
git rm src/app/explore.tsx src/components/animated-icon.module.css src/components/animated-icon.tsx src/components/animated-icon.web.tsx src/components/app-tabs.tsx src/components/app-tabs.web.tsx src/components/external-link.tsx src/components/hint-row.tsx src/components/themed-text.tsx src/components/themed-view.tsx src/components/ui/collapsible.tsx src/components/web-badge.tsx src/constants/theme.ts src/global.css src/hooks/use-color-scheme.ts src/hooks/use-color-scheme.web.ts src/hooks/use-theme.ts
```

In `app.json`, change `"userInterfaceStyle": "automatic"` to `"userInterfaceStyle": "dark"`.

- [ ] **Step 3: Root layout and route**

`src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GameColors } from '@/components/game/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: GameColors.background } }}
      />
    </>
  );
}
```

`src/app/index.tsx`:

```tsx
import { GameScreen } from '@/components/game/game-screen';

export default function Index() {
  return <GameScreen />;
}
```

- [ ] **Step 4: Constants and best-score hook**

`src/components/game/colors.ts`:

```ts
export const GameColors = {
  background: '#0B1026',
  backdrop: 'rgba(5, 8, 22, 0.85)',
  panel: '#141B3D',
  card: '#F5F7FF',
  cardText: '#0B1026',
  glow: '#5CE1FF',
  hero: '#7C5CFF',
  danger: '#FF4D6D',
  bullet: '#FFE14D',
  success: '#4DFF9A',
  text: '#E8ECFF',
  textDim: '#8A93B8',
  button: '#1B2350',
  buttonBorder: '#2E3A7A',
  star: '#FFFFFF',
} as const;
```

`src/components/game/layout.ts`:

```ts
// Height reserved at the bottom of the play area for the hero; its top is the danger line.
export const HERO_HEIGHT = 76;
export const CARD_WIDTH = 168;
export const CARD_HEIGHT = 64;
```

`src/hooks/use-best-score.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'quiz-shooter:best-score';

// Storage failures are swallowed: the game keeps working with the in-memory best.
export function useBestScore() {
  const [best, setBest] = useState(0);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const stored = Number(raw);
        if (!cancelled && Number.isFinite(stored) && stored > 0) {
          setBest((current) => Math.max(current, stored));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(
    (score: number) => {
      if (score <= best) return;
      setBest(score);
      AsyncStorage.setItem(KEY, String(score)).catch(() => {});
    },
    [best],
  );

  return { best, submit };
}
```

- [ ] **Step 5: Starfield**

`src/components/game/starfield.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';

const STAR_COUNT = 50;
const DRIFT_MS = 40000;

interface Star {
  left: number;
  top: number;
  size: number;
  opacity: number;
}

function makeStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() < 0.8 ? 1.5 : 2.5,
    opacity: 0.3 + Math.random() * 0.6,
  }));
}

export function Starfield() {
  const [stars] = useState(makeStars);
  const [height, setHeight] = useState(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.set(withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(drift);
  }, [drift]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.get() * height }],
  }));

  // Two identical layers stacked vertically so the loop is seamless.
  const renderLayer = (offset: number) => (
    <View key={offset} style={[styles.layer, { top: offset, height }]}>
      {stars.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
          {renderLayer(0)}
          {renderLayer(-height)}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  star: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: GameColors.star,
  },
});
```

- [ ] **Step 6: HUD**

`src/components/game/hud.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STARTING_LIVES } from '@/game/reducer';

import { GameColors } from './colors';

interface HudProps {
  lives: number;
  level: number;
  score: number;
  canPause: boolean;
  onPause: () => void;
}

export function Hud({ lives, level, score, canPause, onPause }: HudProps) {
  return (
    <View style={styles.hud}>
      <View style={styles.side}>
        {Array.from({ length: STARTING_LIVES }, (_, i) => (
          <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]}>
            ♥
          </Text>
        ))}
      </View>
      <Text style={styles.level}>LV {level}</Text>
      <View style={[styles.side, styles.right]}>
        <Text style={styles.score}>{score}</Text>
        <Pressable
          onPress={onPause}
          disabled={!canPause}
          hitSlop={12}
          accessibilityLabel="Pause"
          style={[styles.pause, !canPause && styles.hidden]}>
          <Text style={styles.pauseLabel}>II</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 96 },
  right: { justifyContent: 'flex-end', gap: 12 },
  heart: { fontSize: 22, color: GameColors.danger },
  heartLost: { color: GameColors.buttonBorder },
  level: { fontSize: 16, fontWeight: '700', letterSpacing: 2, color: GameColors.glow },
  score: {
    fontSize: 24,
    fontWeight: '800',
    color: GameColors.text,
    fontVariant: ['tabular-nums'],
  },
  pause: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GameColors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseLabel: { fontSize: 14, fontWeight: '800', color: GameColors.text },
  hidden: { opacity: 0 },
});
```

- [ ] **Step 7: Answer pad**

`src/components/game/answer-pad.tsx`:

```tsx
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';

const PLACEHOLDERS = [0, 1, 2, 3];

interface AnswerPadProps {
  questionId: number | null;
  choices: number[];
  disabledChoices: number[];
  locked: boolean;
  onAnswer: (value: number) => void;
}

export function AnswerPad({ questionId, choices, disabledChoices, locked, onAnswer }: AnswerPadProps) {
  return (
    <View style={styles.pad}>
      {questionId === null
        ? PLACEHOLDERS.map((i) => <View key={i} style={[styles.slot, styles.button, styles.placeholder]} />)
        : choices.map((value) => (
            // Keyed by question so shake/disabled state resets for each new question.
            <AnswerButton
              key={`${questionId}-${value}`}
              value={value}
              wrong={disabledChoices.includes(value)}
              locked={locked}
              onPress={onAnswer}
            />
          ))}
    </View>
  );
}

interface AnswerButtonProps {
  value: number;
  wrong: boolean;
  locked: boolean;
  onPress: (value: number) => void;
}

function AnswerButton({ value, wrong, locked, onPress }: AnswerButtonProps) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!wrong) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withRepeat(withTiming(10, { duration: 80 }), 4, true),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [wrong, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <Animated.View style={[styles.slot, shakeStyle]}>
      <Pressable
        disabled={wrong || locked}
        onPress={() => onPress(value)}
        style={({ pressed }) => [styles.button, wrong && styles.wrong, pressed && styles.pressed]}>
        <Text style={[styles.label, wrong && styles.wrongLabel]}>{value}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  slot: { flexBasis: '46%', flexGrow: 1 },
  button: {
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { opacity: 0.4 },
  pressed: { borderColor: GameColors.glow, transform: [{ scale: 0.97 }] },
  wrong: { borderColor: GameColors.danger, backgroundColor: '#3A1426' },
  label: {
    fontSize: 28,
    fontWeight: '800',
    color: GameColors.text,
    fontVariant: ['tabular-nums'],
  },
  wrongLabel: { color: GameColors.danger },
});
```

- [ ] **Step 8: Overlay**

`src/components/game/overlay.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Phase } from '@/game/reducer';

import { GameColors } from './colors';

interface OverlayProps {
  phase: Phase;
  score: number;
  best: number;
  isNewBest: boolean;
  onStart: () => void;
  onResume: () => void;
}

export function Overlay({ phase, score, best, isNewBest, onStart, onResume }: OverlayProps) {
  if (phase === 'playing') return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        {phase === 'ready' && (
          <>
            <Text style={styles.title}>Quiz Shooter</Text>
            <Text style={styles.subtitle}>Shoot down the math before it lands</Text>
            <Text style={styles.stat}>Best {best}</Text>
            <PrimaryButton label="Play" onPress={onStart} />
          </>
        )}
        {phase === 'paused' && (
          <>
            <Text style={styles.title}>Paused</Text>
            <PrimaryButton label="Resume" onPress={onResume} />
          </>
        )}
        {phase === 'gameover' && (
          <>
            <Text style={styles.title}>Game Over</Text>
            {isNewBest && <Text style={styles.badge}>New best!</Text>}
            <Text style={styles.stat}>Score {score}</Text>
            <Text style={styles.statDim}>Best {best}</Text>
            <PrimaryButton label="Play again" onPress={onStart} />
          </>
        )}
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GameColors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
  title: { fontSize: 34, fontWeight: '900', color: GameColors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: GameColors.textDim, textAlign: 'center' },
  badge: {
    fontSize: 14,
    fontWeight: '800',
    color: GameColors.background,
    backgroundColor: GameColors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stat: { fontSize: 22, fontWeight: '700', color: GameColors.text },
  statDim: { fontSize: 16, color: GameColors.textDim },
  button: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    backgroundColor: GameColors.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonLabel: { fontSize: 20, fontWeight: '800', color: GameColors.background },
});
```

- [ ] **Step 9: Game screen (shell version)**

`src/components/game/game-screen.tsx`:

```tsx
import { useCallback, useEffect, useReducer, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { useBestScore } from '@/hooks/use-best-score';

import { AnswerPad } from './answer-pad';
import { GameColors } from './colors';
import { Hud } from './hud';
import { Overlay } from './overlay';
import { Starfield } from './starfield';

export function GameScreen() {
  const [reducer] = useState(() => createGameReducer(createRng(Date.now())));
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { best, submit } = useBestScore();
  const [bestAtStart, setBestAtStart] = useState(0);
  const { phase, score, level, lives, question, disabledChoices, destroying } = state;

  useEffect(() => {
    if (phase === 'gameover') submit(score);
  }, [phase, score, submit]);

  const handleStart = useCallback(() => {
    setBestAtStart(best);
    dispatch({ type: 'START' });
  }, [best]);

  const handleAnswer = useCallback((value: number) => {
    dispatch({ type: 'ANSWER', value, progress: 0 });
  }, []);

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Hud
          lives={lives}
          level={level}
          score={score}
          canPause={phase === 'playing'}
          onPause={() => dispatch({ type: 'PAUSE' })}
        />
        <View style={styles.playArea}>
          {question && <Text style={styles.card}>{question.text}</Text>}
        </View>
        <AnswerPad
          questionId={question?.id ?? null}
          choices={question?.choices ?? []}
          disabledChoices={disabledChoices}
          locked={phase !== 'playing' || destroying}
          onAnswer={handleAnswer}
        />
      </SafeAreaView>
      <Overlay
        phase={phase}
        score={score}
        best={best}
        isNewBest={phase === 'gameover' && score > bestAtStart}
        onStart={handleStart}
        onResume={() => dispatch({ type: 'RESUME' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1 },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { fontSize: 30, fontWeight: '800', color: GameColors.text },
});
```

- [ ] **Step 10: Verify**

```bash
npx tsc --noEmit
npx expo lint
npm test
```

Expected: no type errors, no lint errors, all tests pass. Then run `npx expo start --web`, open the page, and check:
- The dark start overlay shows "Quiz Shooter", "Best 0" and Play.
- Play shows the HUD (3 hearts, LV 1, score 0), a question and 4 answers.
- A wrong tap turns that button red, shakes it, and dims a heart.
- Three wrong taps on one question show the Game Over panel.
- Play again resets the run.
- After a reload with a nonzero score saved, the start overlay shows it.

If the page reports an unmatched route or a stale typed-route error for `explore`, stop and restart `expo start` (it regenerates `.expo/types`).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: replace template with quiz shooter shell, HUD, answers and overlays

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Falling question, hero, bullet, shatter, haptics and pause

**Files:**
- Create: `src/components/game/hero.tsx`, `src/components/game/falling-question.tsx`
- Modify: `src/components/game/game-screen.tsx` (full replacement below)

**Interfaces:**
- Consumes: `GameColors`, `HERO_HEIGHT`, `CARD_WIDTH`, `CARD_HEIGHT`, `Hud`, `AnswerPad`, `Overlay`, `Starfield`, `useBestScore` (Task 4); `Question` (Task 2); reducer API (Task 3); `configForLevel` (Task 1)
- Produces:
  - `Hero({ firing: boolean; hitCount: number })`
  - `FallingQuestion({ question: Question | null; fallMs: number; paused: boolean; destroying: boolean; lastPoints: number; progress: SharedValue<number>; onHit: () => void; onDestroyed: () => void })`
  - The progress shared value is owned by `GameScreen`. `FallingQuestion` animates it from 0 to 1, and `GameScreen` reads it when an answer is tapped.

- [ ] **Step 1: Hero**

`src/components/game/hero.tsx`:

```tsx
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';
import { HERO_HEIGHT } from './layout';

interface HeroProps {
  firing: boolean;
  hitCount: number;
}

export function Hero({ firing, hitCount }: HeroProps) {
  const damage = useSharedValue(0);
  const muzzle = useSharedValue(0);

  useEffect(() => {
    if (hitCount === 0) return;
    damage.set(withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 420 })));
  }, [hitCount, damage]);

  useEffect(() => {
    if (!firing) return;
    muzzle.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 160 })));
  }, [firing, muzzle]);

  const damageStyle = useAnimatedStyle(() => ({ opacity: damage.get() }));
  const muzzleStyle = useAnimatedStyle(() => ({
    opacity: muzzle.get(),
    transform: [{ scale: 0.6 + muzzle.get() * 0.6 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.muzzle, muzzleStyle]} />
      <View style={styles.barrel} />
      <View>
        <View style={styles.body} />
        <Animated.View style={[styles.body, styles.damage, damageStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    pointerEvents: 'none',
  },
  muzzle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: -4,
    backgroundColor: GameColors.bullet,
  },
  barrel: {
    width: 8,
    height: 20,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: GameColors.glow,
  },
  // Triangle made from borders so no image assets are needed.
  body: {
    width: 0,
    height: 0,
    borderLeftWidth: 28,
    borderRightWidth: 28,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: GameColors.hero,
  },
  damage: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderBottomColor: GameColors.danger,
  },
});
```

- [ ] **Step 2: Falling question**

`src/components/game/falling-question.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Question } from '@/game/questions';

import { GameColors } from './colors';
import { CARD_HEIGHT, CARD_WIDTH, HERO_HEIGHT } from './layout';

const BULLET_MS = 150;
// Fragments finish at FRAGMENT_END of the break; the remainder is the ~300ms gap before the next question.
const BREAK_MS = 750;
const FRAGMENT_END = 0.6;
const BULLET_HEIGHT = 18;
const FRAGMENTS = [
  { dx: -1, dy: -0.7, spin: -220 },
  { dx: 1, dy: -0.7, spin: 200 },
  { dx: -1.1, dy: 0.3, spin: 160 },
  { dx: 1.1, dy: 0.3, spin: -180 },
  { dx: -0.4, dy: 0.9, spin: 260 },
  { dx: 0.4, dy: 0.9, spin: -240 },
];

interface FallingQuestionProps {
  question: Question | null;
  fallMs: number;
  paused: boolean;
  destroying: boolean;
  lastPoints: number;
  progress: SharedValue<number>;
  onHit: () => void;
  onDestroyed: () => void;
}

export function FallingQuestion({
  question,
  fallMs,
  paused,
  destroying,
  lastPoints,
  progress,
  onHit,
  onDestroyed,
}: FallingQuestionProps) {
  const [playHeight, setPlayHeight] = useState(0);
  const bullet = useSharedValue(0);
  const shatter = useSharedValue(0);
  const questionId = question?.id ?? null;
  const travel = Math.max(0, playHeight - HERO_HEIGHT - CARD_HEIGHT);
  const heroTop = Math.max(0, playHeight - HERO_HEIGHT);

  // New question: back to the top, clear bullet/shatter. Must stay above the fall effect.
  useEffect(() => {
    progress.set(0);
    bullet.set(0);
    shatter.set(0);
  }, [questionId, progress, bullet, shatter]);

  // Fall (or resume falling) for whatever time is left; freeze on pause or when shot.
  useEffect(() => {
    if (questionId === null || paused || destroying || playHeight === 0) return;
    const remaining = Math.max(0, fallMs * (1 - progress.get()));
    progress.set(
      withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(onHit);
      }),
    );
    return () => cancelAnimation(progress);
  }, [questionId, paused, destroying, playHeight, fallMs, progress, onHit]);

  // Correct answer: bullet flies up, then the card shatters, then report back.
  useEffect(() => {
    if (!destroying) return;
    bullet.set(
      withTiming(1, { duration: BULLET_MS }, (finished) => {
        if (!finished) return;
        shatter.set(
          withTiming(1, { duration: BREAK_MS }, (done) => {
            if (done) scheduleOnRN(onDestroyed);
          }),
        );
      }),
    );
  }, [destroying, bullet, shatter, onDestroyed]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: shatter.get() > 0 ? 0 : 1,
    transform: [{ translateY: progress.get() * travel }],
  }));

  const bulletStyle = useAnimatedStyle(() => {
    const b = bullet.get();
    const start = heroTop - BULLET_HEIGHT;
    const target = progress.get() * travel + CARD_HEIGHT;
    return {
      opacity: b > 0 && b < 1 ? 1 : 0,
      transform: [{ translateY: start - b * (start - target) }],
    };
  });

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * travel + CARD_HEIGHT / 2 }],
  }));

  const pointsStyle = useAnimatedStyle(() => {
    const s = shatter.get();
    return { opacity: s > 0 ? 1 - s : 0, transform: [{ translateY: -60 * s }] };
  });

  return (
    <View style={styles.root} onLayout={(e) => setPlayHeight(e.nativeEvent.layout.height)}>
      {question && (
        <>
          <Animated.View style={[styles.cardLane, cardStyle]}>
            <View style={styles.card}>
              <Text style={styles.cardText}>{question.text}</Text>
            </View>
          </Animated.View>
          <Animated.View style={[styles.bullet, bulletStyle]} />
          <Animated.View style={[styles.burst, burstStyle]}>
            {FRAGMENTS.map((f, i) => (
              <Fragment key={i} shatter={shatter} {...f} />
            ))}
            <Animated.Text style={[styles.points, pointsStyle]}>+{lastPoints}</Animated.Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

interface FragmentProps {
  shatter: SharedValue<number>;
  dx: number;
  dy: number;
  spin: number;
}

function Fragment({ shatter, dx, dy, spin }: FragmentProps) {
  const style = useAnimatedStyle(() => {
    const s = shatter.get();
    const p = interpolate(s, [0, FRAGMENT_END], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: s > 0 ? 1 - p : 0,
      transform: [{ translateX: dx * 90 * p }, { translateY: dy * 90 * p }, { rotate: `${spin * p}deg` }],
    };
  });
  return <Animated.View style={[styles.fragment, style]} />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, pointerEvents: 'none' },
  cardLane: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GameColors.glow,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  cardText: {
    fontSize: 30,
    fontWeight: '800',
    color: GameColors.cardText,
    fontVariant: ['tabular-nums'],
  },
  bullet: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: BULLET_HEIGHT,
    borderRadius: 3,
    backgroundColor: GameColors.bullet,
  },
  // Zero-size anchor at the card's centre; fragments are placed relative to it.
  burst: { position: 'absolute', top: 0, left: '50%', width: 0, height: 0 },
  fragment: {
    position: 'absolute',
    left: -14,
    top: -10,
    width: 28,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.card,
  },
  points: {
    position: 'absolute',
    left: -40,
    top: -14,
    width: 80,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: GameColors.success,
  },
});
```

- [ ] **Step 3: Game screen (final version)**

Replace `src/components/game/game-screen.tsx` entirely:

```tsx
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { configForLevel } from '@/game/difficulty';
import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { useBestScore } from '@/hooks/use-best-score';

import { AnswerPad } from './answer-pad';
import { GameColors } from './colors';
import { FallingQuestion } from './falling-question';
import { Hero } from './hero';
import { Hud } from './hud';
import { Overlay } from './overlay';
import { Starfield } from './starfield';

function haptic(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

export function GameScreen() {
  const [reducer] = useState(() => createGameReducer(createRng(Date.now())));
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { best, submit } = useBestScore();
  const [bestAtStart, setBestAtStart] = useState(0);
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);
  const {
    phase,
    score,
    level,
    lives,
    question,
    disabledChoices,
    destroying,
    lastPoints,
    damageCount,
    hitCount,
  } = state;

  // Backgrounding the app (calls, app switcher) pauses so no lives are lost unseen.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') dispatch({ type: 'PAUSE' });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (damageCount > 0) haptic(Haptics.ImpactFeedbackStyle.Heavy);
  }, [damageCount]);

  useEffect(() => {
    if (hitCount === 0) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 40 }),
        withTiming(10, { duration: 40 }),
        withTiming(-6, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      ),
    );
  }, [hitCount, shake]);

  useEffect(() => {
    if (phase === 'gameover') submit(score);
  }, [phase, score, submit]);

  const handleStart = useCallback(() => {
    setBestAtStart(best);
    dispatch({ type: 'START' });
  }, [best]);

  const handleAnswer = useCallback(
    (value: number) => {
      if (question && value === question.answer) haptic(Haptics.ImpactFeedbackStyle.Light);
      dispatch({ type: 'ANSWER', value, progress: progress.get() });
    },
    [question, progress],
  );

  // Stable identities matter: FallingQuestion restarts its fall when these change.
  const handleHit = useCallback(() => dispatch({ type: 'QUESTION_HIT' }), []);
  const handleDestroyed = useCallback(() => dispatch({ type: 'DESTROY_DONE' }), []);
  const handlePause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const handleResume = useCallback(() => dispatch({ type: 'RESUME' }), []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Hud lives={lives} level={level} score={score} canPause={phase === 'playing'} onPause={handlePause} />
        <Animated.View style={[styles.playArea, shakeStyle]}>
          <FallingQuestion
            question={question}
            fallMs={configForLevel(level).fallMs}
            paused={phase !== 'playing'}
            destroying={destroying}
            lastPoints={lastPoints}
            progress={progress}
            onHit={handleHit}
            onDestroyed={handleDestroyed}
          />
          <Hero firing={destroying} hitCount={hitCount} />
        </Animated.View>
        <AnswerPad
          questionId={question?.id ?? null}
          choices={question?.choices ?? []}
          disabledChoices={disabledChoices}
          locked={phase !== 'playing' || destroying}
          onAnswer={handleAnswer}
        />
      </SafeAreaView>
      <Overlay
        phase={phase}
        score={score}
        best={best}
        isNewBest={phase === 'gameover' && score > bestAtStart}
        onStart={handleStart}
        onResume={handleResume}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1 },
  playArea: { flex: 1 },
});
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx expo lint
npm test
```

Expected: no type errors, no lint errors, all tests pass.

Then run `npx expo start --web` and check:
- At level 1 the card falls from the top to just above the hero in about 8s.
- A correct answer early shows the muzzle flash, then the bullet reaching the card, then the card shattering with "+3". The next question appears at the top.
- A correct answer mid-fall gives "+2", and near the bottom "+1".
- Letting a card land shakes the screen, flashes the hero red, drops a heart, and starts a new question from the top.
- The pause button freezes the card and shows the Paused overlay. Resume continues from the same height, not from the top.
- Switching browser tabs pauses the game (AppState maps to page visibility on web).
- After reaching score 5, the HUD shows LV 2 and `−` questions start appearing.
- Game over shows "New best!" when the score beats the previous best.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: animate falling questions, hero gun, bullet and shatter with haptics and auto-pause

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Final verification

**Files:** none expected. Fix anything the checks report inside the file that owns it.

- [ ] **Step 1: Run the full check suite**

```bash
npx expo-doctor
npx expo lint
npx tsc --noEmit
npm test
```

Expected: every command exits 0. If `expo-doctor` flags package versions, run `npx expo install --fix`, re-run all four, and commit the lockfile change.

- [ ] **Step 2: Device check (human)**

Ask the user to run `npx expo start`, open the app in Expo Go on a phone, and confirm:
- Haptics fire: a light tap on a correct answer, a heavy buzz on a lost life.
- Backgrounding the app pauses the game.
- The animation stays smooth.
- The layout fits notched and short screens: the answer pad isn't clipped, and the hero sits clear of the pad.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix issues found in final verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Skip this commit if there were no changes.
