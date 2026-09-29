# English Mode & Subject Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player pick Mathematics or English at launch. English is fill-in-the-blank grammar using the same shooter mechanics. Both subjects reveal the right answer on a miss.

**Architecture:**
- Questions become subject-agnostic text (`Question` with `prompt`/`answer`/`choices`/`reveal`).
- Each subject is a small pure module (`math.ts`, `english.ts` plus a sentence bank) behind a `SUBJECTS` registry.
- The reducer asks the current subject for questions and gains a `revealing` step (`QUESTION_HIT`/final wrong tap → `REVEAL_DONE`) and `QUIT`.
- The UI adds a subject picker, per-subject card sizes, the reveal, and per-subject best scores.

**Tech Stack:** Expo SDK 57, Expo Router, React 19.2 (React Compiler on), React Native 0.86, Reanimated 4.5 (`.get()/.set()`), react-native-worklets 0.10 (`scheduleOnRN`), AsyncStorage v2, jest-expo, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-09-29-english-mode-design.md`. It builds on `docs/superpowers/specs/2026-09-29-quiz-shooter-design.md`.

## Global Constraints

- **No new packages.** If one ever seems needed, stop and report. Install only with `npx expo install`.
- `src/game/**` must not import React, React Native, or Expo modules.
- Tests live in `__tests__/` (subfolders allowed), named `*-test.ts`, and import source by relative path. Files they import may use `@/…` only as `import type` (erased at test time).
- The screen is always dark. Portrait only.
- **Best-score storage keys:**
  - Math: `quiz-shooter:best-score` (unchanged; existing bests must carry over).
  - English: `quiz-shooter:best-score:english`.
- **English bank rules (spec §3):**
  - Exactly one `___` (three underscores) per sentence.
  - Exactly one grammatical, natural choice.
  - All 4 choices distinct case-insensitively, trimmed, 1–3 words, and capitalised when the blank starts the sentence.
  - Sentences end with `.`, `?` or `!`.
  - Ids are `en-<band>-<nnn>`.
  - At least 35 items per band.
  - American English spelling.
- The reveal lasts **1500 ms**. The fall, bullet, shatter and reveal timings use `reduceMotion: ReduceMotion.Never`.
- In `falling-question.tsx`, the reset effect **must stay declared above** the fall effect (the queued `set(0)` ordering is load-bearing), and a fresh question never reads `progress.get()` (`startedIdRef`).
- Use `...StyleSheet.absoluteFill` (`absoluteFillObject` was removed in RN 0.86).
- Done means `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass.
- **The working tree has unrelated uncommitted user changes** (`app.json`, `package.json`, and an `android/` folder). Never stage them: always `git add` explicit paths, never `git add -A` or `git add .`.
- Commit messages end with a blank line, then exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **An English sentence where two choices are both correct.** The player gets marked wrong for a right answer. No unit test can judge grammar. The Task 2 task review is the gate: it must read every item against the spec §3 content rules. Task 2's mechanical tests pin everything checkable (case-insensitive distinctness, one blank, capitalisation, word count).
2. **The app backgrounds or the player quits during a reveal.** The game must not stall, and Menu must work. The tests are in Task 4: "still moves on if the reveal finishes while paused" and "QUIT works during a reveal and is ignored elsewhere".
3. **A final wrong tap.** The answer must be revealed before game over, and nothing can be scored during the reveal. The tests are in Task 4: "a final wrong tap reveals the answer before game over" and "ignores answers and hits while revealing".
4. **Long English runs.** The level-6+ pool (bands 4+5) gets used up. Questions must keep coming, with repeats only after the pool runs out. The test is in Task 3: "avoids used items until the pool runs out, then reuses them".
5. **Upgrading players.** Their saved Math best must survive the move to per-subject bests. The test is in Task 6: "keeps the original Math key so saved bests carry over".

## Plan decisions not spelled out in the spec

- `makeEnglishQuestion` takes an optional `bank` argument (defaulting to `ENGLISH_BANK`) so tests can exercise pool exhaustion with a tiny bank. It throws a clear error if a level has no items.
- `QUIT` resets score/level/lives to their initial values (and keeps `subject`, `nextId`, `damageCount`, `hitCount`), so the HUD behind the subject picker is clean.
- Storage keys move to a pure module, `src/hooks/best-score-keys.ts`, so they can be unit-tested. The hook is renamed `use-best-scores.ts` / `useBestScores`.
- The card size helper `cardSizeFor(subject, playAreaWidth)` lives in `src/components/game/layout.ts` (pure, testable).
- The blank is drawn on the card as `_____` in a muted blue, and the revealed answer in `#0A8F4E`.

## File Map

| File | Task | Responsibility |
|---|---|---|
| `src/game/question.ts` | 1 | Shared text `Question` type |
| `src/game/math.ts` (from `questions.ts`) | 1 | Math generator → text `Question` |
| `src/game/english-bank.ts` | 2 | `EnglishItem` + `ENGLISH_BANK` (200 items) |
| `src/game/english.ts` | 3 | `bandsForLevel`, `englishFallMs`, `makeEnglishQuestion` |
| `src/game/subjects.ts` | 3 | `SubjectId`, `Subject`, `SUBJECTS`, `SUBJECT_IDS` |
| `src/game/reducer.ts` | 1, 4 | Game state: subject, reveal, quit |
| `src/components/game/layout.ts` | 5 | `HERO_HEIGHT`, `cardSizeFor` |
| `src/components/game/colors.ts` | 5 | Reveal / blank colours |
| `src/components/game/falling-question.tsx` | 1, 5 | Card per subject, blank/reveal text, reveal timer |
| `src/components/game/answer-pad.tsx` | 1, 5 | Text choices, shrink-to-fit, reveal highlight |
| `src/hooks/best-score-keys.ts` | 6 | Storage keys |
| `src/hooks/use-best-scores.ts` (from `use-best-score.ts`) | 6 | Per-subject bests |
| `src/components/game/overlay.tsx` | 6 | Subject picker, pause Menu, Change subject |
| `src/components/game/hud.tsx` | 6 | Subject label |
| `src/components/game/game-screen.tsx` | 1, 4, 5, 6 | Wiring |

---

### Task 1: Text-based questions (Math keeps working)

**Files:**
- Create: `src/game/question.ts`
- Rename + modify: `src/game/questions.ts` → `src/game/math.ts`
- Modify: `src/game/reducer.ts`, `src/components/game/answer-pad.tsx`, `src/components/game/falling-question.tsx`, `src/components/game/game-screen.tsx`
- Rename + modify test: `__tests__/game/questions-test.ts` → `__tests__/game/math-test.ts`
- Modify test: `__tests__/game/reducer-test.ts`

**Interfaces:**
- Produces:
  - `interface Question { id: number; key: string; prompt: string; answer: string; choices: string[]; reveal: { before: string; after: string } }` in `src/game/question.ts`
  - `makeMathQuestion(level: number, rng: Rng, id: number): Question`
  - `makeChoices(answer: number, rng: Rng): number[]` (unchanged)
  - `OPERATOR_SYMBOL` (unchanged)
- Reducer: `disabledChoices: string[]`, and the ANSWER action is `{ type: 'ANSWER'; questionId: number; value: string; progress: number }`.

- [ ] **Step 1: Rename files with history**

```bash
git mv src/game/questions.ts src/game/math.ts
git mv __tests__/game/questions-test.ts __tests__/game/math-test.ts
```

- [ ] **Step 2: Write the failing math test**

Replace `__tests__/game/math-test.ts` entirely:

```ts
import { configForLevel } from '../../src/game/difficulty';
import { makeChoices, makeMathQuestion, OPERATOR_SYMBOL } from '../../src/game/math';
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

describe('makeMathQuestion', () => {
  it('produces valid questions across levels 1-12', () => {
    for (let level = 1; level <= 12; level++) {
      const allowed = configForLevel(level).operators.map((op) => OPERATOR_SYMBOL[op]);
      for (let seed = 1; seed <= 200; seed++) {
        const q = makeMathQuestion(level, createRng(seed * 31 + level), 7);
        const [a, op, b] = q.prompt.split(' ');
        const answer = Number(q.answer);
        expect(q.id).toBe(7);
        expect(allowed).toContain(op);
        expect(EVAL[op](Number(a), Number(b))).toBe(answer);
        expect(Number.isInteger(answer)).toBe(true);
        expect(answer).toBeGreaterThanOrEqual(0);
        // Choices are canonical integer strings, so the answer pad shows "42", not "42.0".
        expect(q.choices.every((c) => String(Number(c)) === c)).toBe(true);
        expectValidChoices(q.choices.map(Number), answer);
      }
    }
  });

  it('uses the prompt as the key and reveals "<prompt> = <answer>"', () => {
    const q = makeMathQuestion(3, createRng(5), 1);
    expect(q.key).toBe(q.prompt);
    expect(q.reveal).toEqual({ before: `${q.prompt} = `, after: '' });
    expect(q.reveal.before + q.answer + q.reveal.after).toBe(`${q.prompt} = ${q.answer}`);
  });

  it('only uses addition at level 1', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(makeMathQuestion(1, createRng(seed), 1).prompt).toContain('+');
    }
  });

  it('eventually produces every operator at level 4', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      seen.add(makeMathQuestion(4, createRng(seed), 1).prompt.split(' ')[1]);
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

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- __tests__/game/math-test.ts`
Expected: FAIL. `makeMathQuestion` is not a function / not exported.

- [ ] **Step 4: Implement the question type and the text-based Math generator**

Create `src/game/question.ts`:

```ts
// A question in any subject, as text. The UI renders these fields without knowing the subject.
export interface Question {
  id: number;
  // Identifies the content (e.g. "en-3-017" or "7 × 6") so a run can avoid repeats.
  key: string;
  prompt: string;
  answer: string;
  choices: string[];
  // Shown on a miss as before + answer + after, with the answer highlighted.
  reveal: { before: string; after: string };
}
```

Replace `src/game/math.ts` entirely:

```ts
import { configForLevel, type Operator } from './difficulty';
import type { Question } from './question';
import { pick, randInt, shuffle, type Rng } from './random';

export const OPERATOR_SYMBOL: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '×': '×',
  '÷': '÷',
};

const SMALL_OFFSETS = [-3, -2, -1, 1, 2, 3];
const LARGE_OFFSETS = [-10, 10];

export function makeMathQuestion(level: number, rng: Rng, id: number): Question {
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

  const prompt = `${a} ${OPERATOR_SYMBOL[op]} ${b}`;
  return {
    id,
    key: prompt,
    prompt,
    answer: String(answer),
    choices: makeChoices(answer, rng).map(String),
    reveal: { before: `${prompt} = `, after: '' },
  };
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

- [ ] **Step 5: Run the math test to verify it passes**

Run: `npm test -- __tests__/game/math-test.ts`
Expected: PASS.

- [ ] **Step 6: Point the reducer at the text model**

In `src/game/reducer.ts`:
- Replace the import line `import { makeQuestion, type Question } from './questions';` with two lines:

```ts
import { makeMathQuestion } from './math';
import type { Question } from './question';
```

- Change the field `disabledChoices: number[];` to `disabledChoices: string[];`.
- Change the ANSWER member of `GameAction` to `| { type: 'ANSWER'; questionId: number; value: string; progress: number }`.
- In `withNextQuestion`, change `question: makeQuestion(state.level, rng, state.nextId),` to `question: makeMathQuestion(state.level, rng, state.nextId),`.

In `__tests__/game/reducer-test.ts` change the helpers and the one typed array to text:

```ts
function answerOf(state: GameState): string {
  return state.question!.answer;
}

function wrongOf(state: GameState, skip: string[] = []): string {
  return state.question!.choices.find((c) => c !== state.question!.answer && !skip.includes(c))!;
}
```

In the test `'ends the game on a third wrong tap'`, change `const tapped: number[] = [];` to `const tapped: string[] = [];`.

- [ ] **Step 7: Update the UI to text choices**

`src/components/game/answer-pad.tsx`:
- In `AnswerPadProps`: `choices: string[];`, `disabledChoices: string[];` and `onAnswer: (value: string) => void;`.
- In `AnswerButtonProps`: `value: string;` and `onPress: (value: string) => void;`.

`src/components/game/falling-question.tsx`:
- Change `import type { Question } from '@/game/questions';` to `import type { Question } from '@/game/question';`.
- Change `{question.text}` to `{question.prompt}`.

`src/components/game/game-screen.tsx`: in `handleAnswer`, change `(value: number) => {` to `(value: string) => {`.

- [ ] **Step 8: Verify and commit**

```bash
npm test
npx tsc --noEmit
npx expo lint
git add src/game/question.ts src/game/math.ts src/game/reducer.ts src/components/game/answer-pad.tsx src/components/game/falling-question.tsx src/components/game/game-screen.tsx __tests__/game/math-test.ts __tests__/game/reducer-test.ts
git commit -m "refactor(game): make questions text-based with a reveal, math first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 69 tests pass. The suite had 68; the math file gains one test, the reveal-format check. tsc and lint are clean. Step 1's `git mv` already staged the renames, so don't `git add` the old `questions*.ts` paths; git rejects paths that no longer exist.

---

### Task 2: English sentence bank

**Review note:** this task's review **is** the spec §6 content review. The reviewer must read every item against the content rules, above all "exactly one choice is grammatical and natural in that exact sentence", and flag any ambiguous item with a concrete fix.

**Files:**
- Create: `src/game/english-bank.ts`
- Test: `__tests__/game/english-bank-test.ts`

**Interfaces:**
- Produces:
  - `interface EnglishItem { id: string; band: 1 | 2 | 3 | 4 | 5; sentence: string; answer: string; wrong: [string, string, string] }`
  - `ENGLISH_BANK: readonly EnglishItem[]` (200 items, 40 per band)

- [ ] **Step 1: Write the failing test**

`__tests__/game/english-bank-test.ts`:

```ts
import { ENGLISH_BANK } from '../../src/game/english-bank';

const BANDS = [1, 2, 3, 4, 5] as const;

describe('ENGLISH_BANK', () => {
  it('has at least 35 items in every band', () => {
    for (const band of BANDS) {
      expect(ENGLISH_BANK.filter((item) => item.band === band).length).toBeGreaterThanOrEqual(35);
    }
  });

  it('uses unique ids that match each item band', () => {
    const ids = ENGLISH_BANK.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of ENGLISH_BANK) {
      expect(item.id).toMatch(new RegExp(`^en-${item.band}-\\d{3}$`));
    }
  });

  it('has no duplicate sentences', () => {
    const sentences = ENGLISH_BANK.map((item) => item.sentence);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it.each(ENGLISH_BANK.map((item) => [item.id, item] as const))('%s follows the content rules', (_id, item) => {
    // One blank, written as exactly three underscores.
    expect(item.sentence.split('___')).toHaveLength(2);
    expect(item.sentence).not.toMatch(/____/);
    expect(item.sentence).toBe(item.sentence.trim());
    expect(item.sentence).toMatch(/[.?!]$/);

    const choices = [item.answer, ...item.wrong];
    expect(item.wrong).toHaveLength(3);
    // Distinct even ignoring case, so "Its" and "its" can never both appear.
    expect(new Set(choices.map((c) => c.toLowerCase())).size).toBe(4);
    for (const choice of choices) {
      expect(choice.length).toBeGreaterThan(0);
      expect(choice).toBe(choice.trim());
      expect(choice.split(/\s+/).length).toBeLessThanOrEqual(3);
      if (item.sentence.startsWith('___')) {
        expect(choice[0]).toBe(choice[0].toUpperCase());
      }
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- __tests__/game/english-bank-test.ts`
Expected: FAIL. Cannot find module `../../src/game/english-bank`.

- [ ] **Step 3: Create the bank (transcribe exactly)**

`src/game/english-bank.ts`:

```ts
export interface EnglishItem {
  id: string;
  band: 1 | 2 | 3 | 4 | 5;
  // Contains exactly one "___" (three underscores): the blank.
  sentence: string;
  answer: string;
  wrong: [string, string, string];
}

// Rules for every item (checked mechanically in __tests__/game/english-bank-test.ts, except the
// first, which needs a human): exactly ONE choice is grammatical and natural in that exact sentence;
// context words (yesterday, every day, right now, since 2019...) rule out the others. Four choices
// distinct ignoring case, 1-3 words, capitalised when the blank starts the sentence. American English.
// Bands: 1 basics, 2 everyday tenses, 3 building sentences, 4 getting tricky, 5 tricky usage.
export const ENGLISH_BANK: readonly EnglishItem[] = [
  // Band 1: a/an, am/is/are, plurals, this/these, have/has
  { id: 'en-1-001', band: 1, sentence: 'I ___ a student.', answer: 'am', wrong: ['is', 'are', 'be'] },
  { id: 'en-1-002', band: 1, sentence: 'She ___ my sister.', answer: 'is', wrong: ['am', 'are', 'be'] },
  { id: 'en-1-003', band: 1, sentence: 'They ___ at school today.', answer: 'are', wrong: ['is', 'am', 'be'] },
  { id: 'en-1-004', band: 1, sentence: 'We ___ very happy.', answer: 'are', wrong: ['is', 'am', 'be'] },
  { id: 'en-1-005', band: 1, sentence: '___ you ready for the test?', answer: 'Are', wrong: ['Is', 'Am', 'Be'] },
  { id: 'en-1-006', band: 1, sentence: '___ she your best friend?', answer: 'Is', wrong: ['Are', 'Am', 'Be'] },
  { id: 'en-1-007', band: 1, sentence: 'The children ___ in the garden.', answer: 'are', wrong: ['is', 'am', 'be'] },
  { id: 'en-1-008', band: 1, sentence: 'My cat ___ black and white.', answer: 'is', wrong: ['are', 'am', 'be'] },
  { id: 'en-1-009', band: 1, sentence: 'The apples ___ red and sweet.', answer: 'are', wrong: ['is', 'am', 'be'] },
  { id: 'en-1-010', band: 1, sentence: 'My name ___ Anna.', answer: 'is', wrong: ['are', 'am', 'be'] },
  { id: 'en-1-011', band: 1, sentence: 'You ___ a good friend.', answer: 'are', wrong: ['is', 'am', 'has'] },
  { id: 'en-1-012', band: 1, sentence: 'This bag ___ heavy.', answer: 'is', wrong: ['are', 'am', 'be'] },
  { id: 'en-1-013', band: 1, sentence: 'I ___ nine years old.', answer: 'am', wrong: ['is', 'are', 'have'] },
  { id: 'en-1-014', band: 1, sentence: 'He ___ ten years old.', answer: 'is', wrong: ['has', 'are', 'am'] },
  { id: 'en-1-015', band: 1, sentence: 'This is ___ apple.', answer: 'an', wrong: ['a', 'two', 'many'] },
  { id: 'en-1-016', band: 1, sentence: 'He wants ___ orange.', answer: 'an', wrong: ['a', 'two', 'these'] },
  { id: 'en-1-017', band: 1, sentence: 'I saw ___ elephant at the zoo.', answer: 'an', wrong: ['a', 'two', 'these'] },
  { id: 'en-1-018', band: 1, sentence: 'She is ___ teacher.', answer: 'a', wrong: ['an', 'two', 'these'] },
  { id: 'en-1-019', band: 1, sentence: 'It is ___ hour until lunch.', answer: 'an', wrong: ['a', 'two', 'these'] },
  { id: 'en-1-020', band: 1, sentence: 'We need ___ new car.', answer: 'a', wrong: ['an', 'two', 'these'] },
  { id: 'en-1-021', band: 1, sentence: 'There is ___ egg in the box.', answer: 'an', wrong: ['a', 'two', 'many'] },
  { id: 'en-1-022', band: 1, sentence: 'My father is ___ honest man.', answer: 'an', wrong: ['a', 'two', 'many'] },
  { id: 'en-1-023', band: 1, sentence: 'She has ___ idea.', answer: 'an', wrong: ['a', 'two', 'many'] },
  { id: 'en-1-024', band: 1, sentence: 'I need ___ umbrella today.', answer: 'an', wrong: ['a', 'two', 'these'] },
  { id: 'en-1-025', band: 1, sentence: 'I have three ___.', answer: 'cats', wrong: ['cat', "cat's", 'a cat'] },
  { id: 'en-1-026', band: 1, sentence: 'There are five ___ in the tree.', answer: 'birds', wrong: ['bird', "bird's", 'a bird'] },
  { id: 'en-1-027', band: 1, sentence: 'Two ___ are playing outside.', answer: 'children', wrong: ['child', 'childs', 'childrens'] },
  { id: 'en-1-028', band: 1, sentence: 'The dentist checked all my ___.', answer: 'teeth', wrong: ['tooth', 'tooths', 'teeths'] },
  { id: 'en-1-029', band: 1, sentence: 'There are three ___ on the table.', answer: 'cups', wrong: ['cup', "cup's", 'a cup'] },
  { id: 'en-1-030', band: 1, sentence: 'Three ___ are waiting at the door.', answer: 'men', wrong: ['man', 'mans', 'a man'] },
  { id: 'en-1-031', band: 1, sentence: 'A spider has eight ___.', answer: 'legs', wrong: ['leg', "leg's", 'a leg'] },
  { id: 'en-1-032', band: 1, sentence: 'Ten ___ ran across the field.', answer: 'mice', wrong: ['mouse', 'mouses', 'mices'] },
  { id: 'en-1-033', band: 1, sentence: '___ is my favorite book.', answer: 'This', wrong: ['These', 'Those', 'They'] },
  { id: 'en-1-034', band: 1, sentence: '___ are my new shoes.', answer: 'These', wrong: ['This', 'That', 'It'] },
  { id: 'en-1-035', band: 1, sentence: 'Look at ___ stars in the sky!', answer: 'those', wrong: ['that', 'this', 'a'] },
  { id: 'en-1-036', band: 1, sentence: 'Is ___ your pencil?', answer: 'this', wrong: ['these', 'those', 'they'] },
  { id: 'en-1-037', band: 1, sentence: 'He ___ a big dog.', answer: 'has', wrong: ['have', 'having', 'haves'] },
  { id: 'en-1-038', band: 1, sentence: 'I ___ two brothers.', answer: 'have', wrong: ['has', 'having', 'haves'] },
  { id: 'en-1-039', band: 1, sentence: 'Our house ___ a red door.', answer: 'has', wrong: ['have', 'having', 'haves'] },
  { id: 'en-1-040', band: 1, sentence: 'My parents ___ a small shop.', answer: 'have', wrong: ['has', 'is', 'haves'] },

  // Band 2: present -s, past -ed, present continuous, do/does, there is/are
  { id: 'en-2-001', band: 2, sentence: 'She ___ to school every day.', answer: 'walks', wrong: ['walk', 'walking', 'to walk'] },
  { id: 'en-2-002', band: 2, sentence: 'He ___ football every Sunday.', answer: 'plays', wrong: ['play', 'playing', 'to play'] },
  { id: 'en-2-003', band: 2, sentence: 'My brother ___ TV after dinner.', answer: 'watches', wrong: ['watch', 'watchs', 'watching'] },
  { id: 'en-2-004', band: 2, sentence: 'The sun ___ in the east.', answer: 'rises', wrong: ['rise', 'rising', 'risen'] },
  { id: 'en-2-005', band: 2, sentence: 'Water ___ at 100 degrees Celsius.', answer: 'boils', wrong: ['boil', 'boiling', 'to boil'] },
  { id: 'en-2-006', band: 2, sentence: 'My parents ___ coffee every morning.', answer: 'drink', wrong: ['drinks', 'drinking', 'to drink'] },
  { id: 'en-2-007', band: 2, sentence: 'My sister ___ her teeth twice a day.', answer: 'brushes', wrong: ['brush', 'brushs', 'brushing'] },
  { id: 'en-2-008', band: 2, sentence: "The shop ___ at nine o'clock every day.", answer: 'opens', wrong: ['open', 'opening', 'to open'] },
  { id: 'en-2-009', band: 2, sentence: 'Birds ___ south every winter.', answer: 'fly', wrong: ['flies', 'flying', 'to fly'] },
  { id: 'en-2-010', band: 2, sentence: 'It ___ a lot here in April.', answer: 'rains', wrong: ['rain', 'raining', 'to rain'] },
  { id: 'en-2-011', band: 2, sentence: 'Yesterday we ___ to the park.', answer: 'walked', wrong: ['walk', 'walks', 'walking'] },
  { id: 'en-2-012', band: 2, sentence: 'Last night I ___ my homework.', answer: 'finished', wrong: ['finish', 'finishes', 'finishing'] },
  { id: 'en-2-013', band: 2, sentence: 'They ___ a movie two days ago.', answer: 'watched', wrong: ['watch', 'watches', 'watching'] },
  { id: 'en-2-014', band: 2, sentence: 'She ___ the piano last weekend.', answer: 'played', wrong: ['play', 'plays', 'playing'] },
  { id: 'en-2-015', band: 2, sentence: 'We ___ in London in 2015.', answer: 'lived', wrong: ['live', 'lives', 'living'] },
  { id: 'en-2-016', band: 2, sentence: 'He ___ the door a minute ago.', answer: 'opened', wrong: ['open', 'opens', 'opening'] },
  { id: 'en-2-017', band: 2, sentence: 'We ___ the house last Saturday.', answer: 'cleaned', wrong: ['clean', 'cleans', 'cleaning'] },
  { id: 'en-2-018', band: 2, sentence: 'I ___ my grandmother last Sunday.', answer: 'visited', wrong: ['visit', 'visits', 'visiting'] },
  { id: 'en-2-019', band: 2, sentence: 'The train ___ at the station ten minutes ago.', answer: 'arrived', wrong: ['arrive', 'arrives', 'arriving'] },
  { id: 'en-2-020', band: 2, sentence: 'Listen! The baby ___.', answer: 'is crying', wrong: ['cry', 'cries', 'crying'] },
  { id: 'en-2-021', band: 2, sentence: 'Look! It ___ outside.', answer: 'is snowing', wrong: ['snow', 'snows', 'snowing'] },
  { id: 'en-2-022', band: 2, sentence: 'Right now, I ___ a book.', answer: 'am reading', wrong: ['read', 'reads', 'reading'] },
  { id: 'en-2-023', band: 2, sentence: 'The children ___ in the pool at the moment.', answer: 'are swimming', wrong: ['swim', 'swims', 'swimming'] },
  { id: 'en-2-024', band: 2, sentence: 'Please be quiet. Dad ___.', answer: 'is sleeping', wrong: ['sleep', 'sleeps', 'sleeping'] },
  { id: 'en-2-025', band: 2, sentence: 'Mom ___ dinner right now.', answer: 'is cooking', wrong: ['cook', 'cooks', 'cooking'] },
  { id: 'en-2-026', band: 2, sentence: 'We ___ our lunch at the moment.', answer: 'are eating', wrong: ['eat', 'eats', 'eating'] },
  { id: 'en-2-027', band: 2, sentence: '___ you like pizza?', answer: 'Do', wrong: ['Does', 'Is', 'Are'] },
  { id: 'en-2-028', band: 2, sentence: '___ she speak French?', answer: 'Does', wrong: ['Do', 'Is', 'Are'] },
  { id: 'en-2-029', band: 2, sentence: 'Where ___ your cousins live?', answer: 'do', wrong: ['does', 'is', 'are'] },
  { id: 'en-2-030', band: 2, sentence: 'What time ___ the bus leave?', answer: 'does', wrong: ['do', 'is', 'are'] },
  { id: 'en-2-031', band: 2, sentence: 'I ___ like spinach.', answer: "don't", wrong: ["doesn't", "isn't", "aren't"] },
  { id: 'en-2-032', band: 2, sentence: 'He ___ eat meat.', answer: "doesn't", wrong: ["don't", "isn't", "aren't"] },
  { id: 'en-2-033', band: 2, sentence: '___ your dog bark at night?', answer: 'Does', wrong: ['Do', 'Is', 'Are'] },
  { id: 'en-2-034', band: 2, sentence: 'Why ___ he always late?', answer: 'is', wrong: ['does', 'do', 'are'] },
  { id: 'en-2-035', band: 2, sentence: 'There ___ a cat on the roof.', answer: 'is', wrong: ['are', 'am', 'be'] },
  { id: 'en-2-036', band: 2, sentence: 'There ___ many books on the shelf.', answer: 'are', wrong: ['is', 'am', 'be'] },
  { id: 'en-2-037', band: 2, sentence: 'There ___ some milk in the fridge.', answer: 'is', wrong: ['are', 'am', 'be'] },
  { id: 'en-2-038', band: 2, sentence: '___ there any eggs left?', answer: 'Are', wrong: ['Is', 'Am', 'Do'] },
  { id: 'en-2-039', band: 2, sentence: 'How many students ___ there in your class?', answer: 'are', wrong: ['is', 'am', 'do'] },
  { id: 'en-2-040', band: 2, sentence: 'They ___ basketball on Fridays.', answer: 'play', wrong: ['plays', 'playing', 'to play'] },

  // Band 3: in/on/at, irregular past, comparatives/superlatives, much/many, some/any
  { id: 'en-3-001', band: 3, sentence: 'My birthday is ___ June.', answer: 'in', wrong: ['on', 'at', 'by'] },
  { id: 'en-3-002', band: 3, sentence: 'The party is ___ Saturday.', answer: 'on', wrong: ['in', 'at', 'to'] },
  { id: 'en-3-003', band: 3, sentence: "The movie starts ___ seven o'clock.", answer: 'at', wrong: ['in', 'on', 'to'] },
  { id: 'en-3-004', band: 3, sentence: 'I was born ___ 2010.', answer: 'in', wrong: ['on', 'at', 'to'] },
  { id: 'en-3-005', band: 3, sentence: 'There is a picture ___ the wall.', answer: 'on', wrong: ['in', 'at', 'to'] },
  { id: 'en-3-006', band: 3, sentence: 'She lives ___ Paris.', answer: 'in', wrong: ['on', 'at', 'to'] },
  { id: 'en-3-007', band: 3, sentence: "I'll meet you ___ the bus stop.", answer: 'at', wrong: ['in', 'on', 'to'] },
  { id: 'en-3-008', band: 3, sentence: 'I usually read ___ night.', answer: 'at', wrong: ['in', 'on', 'to'] },
  { id: 'en-3-009', band: 3, sentence: 'School starts ___ September.', answer: 'in', wrong: ['on', 'at', 'to'] },
  { id: 'en-3-010', band: 3, sentence: 'My dad is still ___ bed.', answer: 'in', wrong: ['on', 'at', 'to'] },
  { id: 'en-3-011', band: 3, sentence: 'She is not ___ home right now.', answer: 'at', wrong: ['in', 'on', 'to'] },
  { id: 'en-3-012', band: 3, sentence: 'We watched the game ___ TV.', answer: 'on', wrong: ['in', 'at', 'to'] },
  { id: 'en-3-013', band: 3, sentence: 'Yesterday I ___ a letter to my aunt.', answer: 'wrote', wrong: ['write', 'writed', 'written'] },
  { id: 'en-3-014', band: 3, sentence: 'We ___ to the beach last summer.', answer: 'went', wrong: ['go', 'goed', 'gone'] },
  { id: 'en-3-015', band: 3, sentence: 'She ___ a new dress yesterday.', answer: 'bought', wrong: ['buy', 'buyed', 'buys'] },
  { id: 'en-3-016', band: 3, sentence: 'He ___ his wallet on the bus last week.', answer: 'lost', wrong: ['lose', 'losed', 'loses'] },
  { id: 'en-3-017', band: 3, sentence: 'I ___ a strange noise last night.', answer: 'heard', wrong: ['hear', 'heared', 'hears'] },
  { id: 'en-3-018', band: 3, sentence: 'They ___ the match two days ago.', answer: 'won', wrong: ['win', 'winned', 'wins'] },
  { id: 'en-3-019', band: 3, sentence: 'My mom ___ a delicious cake yesterday.', answer: 'made', wrong: ['make', 'maked', 'makes'] },
  { id: 'en-3-020', band: 3, sentence: 'The children ___ milk with breakfast this morning.', answer: 'drank', wrong: ['drink', 'drinked', 'drinks'] },
  { id: 'en-3-021', band: 3, sentence: 'I ___ my friend at the mall yesterday.', answer: 'saw', wrong: ['see', 'seed', 'seen'] },
  { id: 'en-3-022', band: 3, sentence: 'Last year we ___ a trip to Japan.', answer: 'took', wrong: ['take', 'taked', 'takes'] },
  { id: 'en-3-023', band: 3, sentence: 'He ___ his leg when he fell off his bike.', answer: 'broke', wrong: ['break', 'breaked', 'broken'] },
  { id: 'en-3-024', band: 3, sentence: 'She ___ me a funny story yesterday.', answer: 'told', wrong: ['tell', 'telled', 'tells'] },
  { id: 'en-3-025', band: 3, sentence: 'An elephant is ___ than a horse.', answer: 'bigger', wrong: ['big', 'biggest', 'more big'] },
  { id: 'en-3-026', band: 3, sentence: 'My sister is ___ than me.', answer: 'taller', wrong: ['tall', 'tallest', 'more tall'] },
  { id: 'en-3-027', band: 3, sentence: 'This is the ___ day of the year.', answer: 'hottest', wrong: ['hot', 'hotter', 'most hot'] },
  { id: 'en-3-028', band: 3, sentence: 'Mount Everest is the ___ mountain in the world.', answer: 'highest', wrong: ['high', 'higher', 'most high'] },
  { id: 'en-3-029', band: 3, sentence: 'This test is ___ than the last one.', answer: 'easier', wrong: ['easy', 'easiest', 'more easy'] },
  { id: 'en-3-030', band: 3, sentence: 'She is the ___ student in our class.', answer: 'best', wrong: ['good', 'most good', 'goodest'] },
  { id: 'en-3-031', band: 3, sentence: 'My cold is ___ today than yesterday.', answer: 'worse', wrong: ['bad', 'worst', 'badder'] },
  { id: 'en-3-032', band: 3, sentence: 'This book is ___ than that one.', answer: 'more interesting', wrong: ['interesting', 'most interesting', 'interestinger'] },
  { id: 'en-3-033', band: 3, sentence: 'How ___ water do you drink every day?', answer: 'much', wrong: ['many', 'lot', 'few'] },
  { id: 'en-3-034', band: 3, sentence: 'How ___ brothers do you have?', answer: 'many', wrong: ['much', 'lot', 'a lot'] },
  { id: 'en-3-035', band: 3, sentence: "There isn't ___ sugar left.", answer: 'much', wrong: ['many', 'lots', 'few'] },
  { id: 'en-3-036', band: 3, sentence: "We don't have ___ friends here yet.", answer: 'many', wrong: ['much', 'lot', 'a lot'] },
  { id: 'en-3-037', band: 3, sentence: 'I bought ___ apples at the market.', answer: 'some', wrong: ['any', 'much', 'a'] },
  { id: 'en-3-038', band: 3, sentence: "There aren't ___ cookies left.", answer: 'any', wrong: ['some', 'much', 'a'] },
  { id: 'en-3-039', band: 3, sentence: "She doesn't have ___ brothers or sisters.", answer: 'any', wrong: ['some', 'much', 'a'] },
  { id: 'en-3-040', band: 3, sentence: 'I need ___ help with my homework.', answer: 'some', wrong: ['any', 'many', 'a'] },

  // Band 4: since/for, present perfect, adjective vs adverb, I/me, who/which/whose
  { id: 'en-4-001', band: 4, sentence: 'She has lived here ___ 2019.', answer: 'since', wrong: ['for', 'from', 'during'] },
  { id: 'en-4-002', band: 4, sentence: 'I have known him ___ ten years.', answer: 'for', wrong: ['since', 'from', 'during'] },
  { id: 'en-4-003', band: 4, sentence: 'We have been waiting ___ two hours.', answer: 'for', wrong: ['since', 'from', 'at'] },
  { id: 'en-4-004', band: 4, sentence: 'He has worked at the bank ___ last June.', answer: 'since', wrong: ['for', 'from', 'during'] },
  { id: 'en-4-005', band: 4, sentence: 'They have been friends ___ they were children.', answer: 'since', wrong: ['for', 'from', 'during'] },
  { id: 'en-4-006', band: 4, sentence: 'I have lived in this house ___ I was born.', answer: 'since', wrong: ['for', 'from', 'when'] },
  { id: 'en-4-007', band: 4, sentence: "We've been here ___ nine o'clock.", answer: 'since', wrong: ['for', 'from', 'at'] },
  { id: 'en-4-008', band: 4, sentence: "I've been learning English ___ three years.", answer: 'for', wrong: ['since', 'from', 'during'] },
  { id: 'en-4-009', band: 4, sentence: 'I have ___ this movie three times.', answer: 'seen', wrong: ['saw', 'see', 'seeing'] },
  { id: 'en-4-010', band: 4, sentence: 'She has already ___ her lunch.', answer: 'eaten', wrong: ['ate', 'eat', 'eating'] },
  { id: 'en-4-011', band: 4, sentence: 'Have you ever ___ to Canada?', answer: 'been', wrong: ['was', 'went', 'go'] },
  { id: 'en-4-012', band: 4, sentence: 'We ___ just finished our homework.', answer: 'have', wrong: ['has', 'are', 'is'] },
  { id: 'en-4-013', band: 4, sentence: 'He ___ never been on a plane.', answer: 'has', wrong: ['have', 'is', 'was'] },
  { id: 'en-4-014', band: 4, sentence: 'I ___ my keys. Can you help me find them?', answer: 'have lost', wrong: ['lose', 'loses', 'losing'] },
  { id: 'en-4-015', band: 4, sentence: 'She has ___ in this city all her life.', answer: 'lived', wrong: ['live', 'living', 'lives'] },
  { id: 'en-4-016', band: 4, sentence: 'I ___ finished the book yet.', answer: "haven't", wrong: ["hasn't", "don't", "isn't"] },
  { id: 'en-4-017', band: 4, sentence: 'Has she ___ her homework yet?', answer: 'done', wrong: ['did', 'do', 'doing'] },
  { id: 'en-4-018', band: 4, sentence: "They have ___ to the store. They'll be back soon.", answer: 'gone', wrong: ['been', 'went', 'go'] },
  { id: 'en-4-019', band: 4, sentence: 'He drives very ___.', answer: 'carefully', wrong: ['careful', 'care', 'carefulness'] },
  { id: 'en-4-020', band: 4, sentence: 'She sings ___.', answer: 'beautifully', wrong: ['beautiful', 'beauty', 'more beautiful'] },
  { id: 'en-4-021', band: 4, sentence: 'The test was ___ for me.', answer: 'easy', wrong: ['easily', 'ease', 'easing'] },
  { id: 'en-4-022', band: 4, sentence: 'He speaks English very ___.', answer: 'well', wrong: ['good', 'goodly', 'best'] },
  { id: 'en-4-023', band: 4, sentence: 'The baby smiled ___.', answer: 'happily', wrong: ['happy', 'happiness', 'happiest'] },
  { id: 'en-4-024', band: 4, sentence: 'This soup tastes ___.', answer: 'delicious', wrong: ['deliciously', 'deliciousness', 'more deliciously'] },
  { id: 'en-4-025', band: 4, sentence: 'You look ___ today.', answer: 'tired', wrong: ['tiredly', 'tire', 'tiredness'] },
  { id: 'en-4-026', band: 4, sentence: 'She sang the song ___.', answer: 'perfectly', wrong: ['perfect', 'perfection', 'perfected'] },
  { id: 'en-4-027', band: 4, sentence: 'The man shouted ___ at the driver.', answer: 'angrily', wrong: ['angry', 'anger', 'angrier'] },
  { id: 'en-4-028', band: 4, sentence: 'It was a ___ day, so we went to the beach.', answer: 'sunny', wrong: ['sunnily', 'sun', 'suns'] },
  { id: 'en-4-029', band: 4, sentence: 'My mom and ___ went shopping.', answer: 'I', wrong: ['me', 'myself', 'mine'] },
  { id: 'en-4-030', band: 4, sentence: 'The teacher gave the books to Sam and ___.', answer: 'me', wrong: ['I', 'my', 'mine'] },
  { id: 'en-4-031', band: 4, sentence: 'Tom and ___ are going to the park.', answer: 'I', wrong: ['me', 'my', 'mine'] },
  { id: 'en-4-032', band: 4, sentence: 'Can you help ___ with this box?', answer: 'me', wrong: ['I', 'my', 'mine'] },
  { id: 'en-4-033', band: 4, sentence: 'The man ___ lives next door is a doctor.', answer: 'who', wrong: ['which', 'whose', 'whom'] },
  { id: 'en-4-034', band: 4, sentence: 'This is the book ___ I told you about.', answer: 'which', wrong: ['who', 'whose', 'whom'] },
  { id: 'en-4-035', band: 4, sentence: 'I have a friend ___ speaks four languages.', answer: 'who', wrong: ['which', 'whose', 'whom'] },
  { id: 'en-4-036', band: 4, sentence: 'The cake ___ you made was delicious.', answer: 'which', wrong: ['who', 'whose', 'whom'] },
  { id: 'en-4-037', band: 4, sentence: 'She is the girl ___ bag was stolen.', answer: 'whose', wrong: ['who', 'which', "who's"] },
  { id: 'en-4-038', band: 4, sentence: 'Do you know the woman ___ owns this shop?', answer: 'who', wrong: ['which', 'whose', 'whom'] },
  { id: 'en-4-039', band: 4, sentence: 'We stayed at a hotel ___ was near the beach.', answer: 'which', wrong: ['who', 'whose', 'where'] },
  { id: 'en-4-040', band: 4, sentence: 'This is the house ___ my grandparents built.', answer: 'which', wrong: ['who', 'whose', 'whom'] },

  // Band 5: their/there/they're, your/you're, its/it's, then/than, fewer/less, who/whom, affect/effect,
  // lie/lay, to/too/two, lose/loose, accept/except, quiet/quite, should have, between you and me, if I were
  { id: 'en-5-001', band: 5, sentence: '___ going to be late.', answer: "They're", wrong: ['Their', 'There', 'Theirs'] },
  { id: 'en-5-002', band: 5, sentence: 'The students forgot ___ books.', answer: 'their', wrong: ['there', "they're", 'theirs'] },
  { id: 'en-5-003', band: 5, sentence: 'Put the box over ___.', answer: 'there', wrong: ['their', "they're", 'theirs'] },
  { id: 'en-5-004', band: 5, sentence: '___ are three cats in the garden.', answer: 'There', wrong: ['Their', "They're", 'Theirs'] },
  { id: 'en-5-005', band: 5, sentence: 'Is this ___ jacket?', answer: 'your', wrong: ["you're", 'yours', 'you'] },
  { id: 'en-5-006', band: 5, sentence: '___ my best friend.', answer: "You're", wrong: ['Your', 'Yours', 'You'] },
  { id: 'en-5-007', band: 5, sentence: 'I think ___ right about that.', answer: "you're", wrong: ['your', 'yours', 'you'] },
  { id: 'en-5-008', band: 5, sentence: 'The dog wagged ___ tail.', answer: 'its', wrong: ["it's", 'it', "its'"] },
  { id: 'en-5-009', band: 5, sentence: '___ raining again today.', answer: "It's", wrong: ['Its', 'It', "Its'"] },
  { id: 'en-5-010', band: 5, sentence: 'The company changed ___ name last year.', answer: 'its', wrong: ["it's", 'it', "its'"] },
  { id: 'en-5-011', band: 5, sentence: 'I think ___ time to go home.', answer: "it's", wrong: ['its', 'it', "its'"] },
  { id: 'en-5-012', band: 5, sentence: 'She is taller ___ her brother.', answer: 'than', wrong: ['then', 'that', 'as'] },
  { id: 'en-5-013', band: 5, sentence: 'We ate dinner, and ___ we watched a movie.', answer: 'then', wrong: ['than', 'that', 'them'] },
  { id: 'en-5-014', band: 5, sentence: 'This box is heavier ___ that one.', answer: 'than', wrong: ['then', 'that', 'as'] },
  { id: 'en-5-015', band: 5, sentence: 'First mix the flour, ___ add the eggs.', answer: 'then', wrong: ['than', 'that', 'them'] },
  { id: 'en-5-016', band: 5, sentence: 'There are ___ people here than yesterday.', answer: 'fewer', wrong: ['less', 'little', 'lesser'] },
  { id: 'en-5-017', band: 5, sentence: 'I drink ___ coffee than I used to.', answer: 'less', wrong: ['fewer', 'lesser', 'little'] },
  { id: 'en-5-018', band: 5, sentence: 'We had ___ problems this year than last year.', answer: 'fewer', wrong: ['less', 'little', 'lesser'] },
  { id: 'en-5-019', band: 5, sentence: 'With ___ did you go to the movies?', answer: 'whom', wrong: ['who', "who's", 'whose'] },
  { id: 'en-5-020', band: 5, sentence: 'To ___ should I send this letter?', answer: 'whom', wrong: ['who', 'whose', "who's"] },
  { id: 'en-5-021', band: 5, sentence: '___ bag is this?', answer: 'Whose', wrong: ["Who's", 'Who', 'Whom'] },
  { id: 'en-5-022', band: 5, sentence: '___ coming to dinner tonight?', answer: "Who's", wrong: ['Whose', 'Who', 'Whom'] },
  { id: 'en-5-023', band: 5, sentence: 'The weather can ___ your mood.', answer: 'affect', wrong: ['effect', 'affects', 'effects'] },
  { id: 'en-5-024', band: 5, sentence: 'The new rule had a big ___ on students.', answer: 'effect', wrong: ['affect', 'effects', 'affects'] },
  { id: 'en-5-025', band: 5, sentence: "Loud music doesn't ___ my sleep.", answer: 'affect', wrong: ['effect', 'affects', 'effects'] },
  { id: 'en-5-026', band: 5, sentence: 'Every afternoon, the cat likes to ___ in the sun.', answer: 'lie', wrong: ['lay', 'lays', 'laid'] },
  { id: 'en-5-027', band: 5, sentence: 'Please ___ the book on the table.', answer: 'lay', wrong: ['lie', 'lies', 'laid'] },
  { id: 'en-5-028', band: 5, sentence: 'I ate ___ much cake at the party.', answer: 'too', wrong: ['to', 'two', 'toe'] },
  { id: 'en-5-029', band: 5, sentence: 'We have ___ dogs and a cat.', answer: 'two', wrong: ['too', 'to', 'tow'] },
  { id: 'en-5-030', band: 5, sentence: 'She wants to go ___ the library.', answer: 'to', wrong: ['too', 'two', 'tow'] },
  { id: 'en-5-031', band: 5, sentence: 'These shoes are too ___ for me.', answer: 'loose', wrong: ['lose', 'loss', 'lost'] },
  { id: 'en-5-032', band: 5, sentence: "Don't ___ your ticket!", answer: 'lose', wrong: ['loose', 'loss', 'lost'] },
  { id: 'en-5-033', band: 5, sentence: 'Everyone came ___ Tom, who was sick.', answer: 'except', wrong: ['accept', 'expect', 'excepted'] },
  { id: 'en-5-034', band: 5, sentence: 'Please ___ my apology.', answer: 'accept', wrong: ['except', 'excepts', 'accepts'] },
  { id: 'en-5-035', band: 5, sentence: 'The library is very ___.', answer: 'quiet', wrong: ['quite', 'quit', 'quietly'] },
  { id: 'en-5-036', band: 5, sentence: 'The movie was ___ good.', answer: 'quite', wrong: ['quiet', 'quit', 'quitely'] },
  { id: 'en-5-037', band: 5, sentence: 'You ___ told me about the party!', answer: 'should have', wrong: ['should of', 'should had', 'should has'] },
  { id: 'en-5-038', band: 5, sentence: 'We ___ left earlier to avoid the traffic.', answer: 'could have', wrong: ['could of', 'could had', 'could has'] },
  { id: 'en-5-039', band: 5, sentence: "Between you and ___, I don't like the new rules.", answer: 'me', wrong: ['I', 'myself', 'mine'] },
  { id: 'en-5-040', band: 5, sentence: 'If I ___ you, I would study harder.', answer: 'were', wrong: ['was', 'am', 'be'] },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- __tests__/game/english-bank-test.ts`
Expected: PASS (203 tests: 3 bank-wide checks plus 200 per-item checks).

If a per-item check fails, you made a transcription error. Fix the item to match this plan exactly; do not change the test.

- [ ] **Step 5: Verify and commit**

```bash
npm test
npx tsc --noEmit
npx expo lint
git add src/game/english-bank.ts __tests__/game/english-bank-test.ts
git commit -m "feat(game): add the English grammar sentence bank

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: English questions and the subject registry

**Files:**
- Create: `src/game/english.ts`, `src/game/subjects.ts`
- Test: `__tests__/game/english-test.ts`, `__tests__/game/subjects-test.ts`

**Interfaces:**
- Consumes:
  - `Question` from `./question` (Task 1)
  - `ENGLISH_BANK` and `EnglishItem` (Task 2)
  - `makeMathQuestion` (Task 1)
  - `configForLevel` from `./difficulty`
  - `pick`, `shuffle`, `Rng` from `./random`
- Produces:
  - `bandsForLevel(level: number): number[]`
  - `englishFallMs(level: number): number`
  - `makeEnglishQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[], bank?: readonly EnglishItem[]): Question`
  - `type SubjectId = 'math' | 'english'`
  - `interface Subject { id: SubjectId; name: string; shortName: string; badge: string; fallMs(level: number): number; makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question }`
  - `SUBJECTS: Record<SubjectId, Subject>`
  - `SUBJECT_IDS: readonly SubjectId[]` (`['math', 'english']`)

- [ ] **Step 1: Write the failing tests**

`__tests__/game/english-test.ts`:

```ts
import { bandsForLevel, englishFallMs, makeEnglishQuestion } from '../../src/game/english';
import { ENGLISH_BANK, type EnglishItem } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';

function item(id: string, band: EnglishItem['band']): EnglishItem {
  return { id, band, sentence: `Sentence ${id} has a ___ here.`, answer: 'right', wrong: ['wrong1', 'wrong2', 'wrong3'] };
}

describe('bandsForLevel', () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [4, [4]],
    [5, [5]],
    [6, [4, 5]],
    [12, [4, 5]],
  ])('level %i draws from bands %j', (level, bands) => {
    expect(bandsForLevel(level)).toEqual(bands);
  });
});

describe('englishFallMs', () => {
  it.each([
    [1, 12000],
    [2, 11000],
    [3, 10000],
    [4, 9000],
    [5, 8500],
    [6, 8000],
    [9, 6500],
    [10, 6000],
    [11, 6000],
    [50, 6000],
  ])('level %i falls in %i ms', (level, ms) => {
    expect(englishFallMs(level)).toBe(ms);
  });
});

describe('makeEnglishQuestion', () => {
  it('builds a question from an item in the level band', () => {
    for (let level = 1; level <= 8; level++) {
      for (let seed = 1; seed <= 50; seed++) {
        const q = makeEnglishQuestion(level, createRng(seed), 9, []);
        const source = ENGLISH_BANK.find((i) => i.id === q.key);
        expect(source).toBeDefined();
        expect(bandsForLevel(level)).toContain(source!.band);
        expect(q.id).toBe(9);
        expect(q.prompt).toBe(source!.sentence);
        expect(q.answer).toBe(source!.answer);
        expect([...q.choices].sort()).toEqual([source!.answer, ...source!.wrong].sort());
        expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1);
        expect(q.reveal.before + q.answer + q.reveal.after).toBe(source!.sentence.replace('___', source!.answer));
      }
    }
  });

  it('does not always put the answer first', () => {
    const positions = new Set(
      Array.from({ length: 50 }, (_, seed) => {
        const q = makeEnglishQuestion(1, createRng(seed + 1), 1, []);
        return q.choices.indexOf(q.answer);
      }),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a seed', () => {
    expect(makeEnglishQuestion(3, createRng(42), 1, [])).toEqual(makeEnglishQuestion(3, createRng(42), 1, []));
  });

  it('avoids used items until the pool runs out, then reuses them', () => {
    const bank = [item('en-1-001', 1), item('en-1-002', 1), item('en-1-003', 1), item('en-2-001', 2)];
    const rng = createRng(7);
    const used: string[] = [];
    for (let i = 0; i < 3; i++) {
      used.push(makeEnglishQuestion(1, rng, i, used, bank).key);
    }
    expect([...used].sort()).toEqual(['en-1-001', 'en-1-002', 'en-1-003']);
    // Every band-1 item has been used: the next pick reuses one instead of failing.
    expect(used).toContain(makeEnglishQuestion(1, rng, 3, used, bank).key);
  });

  it('never repeats a sentence while fresh ones remain in the real bank', () => {
    const rng = createRng(3);
    const used: string[] = [];
    const bandSize = ENGLISH_BANK.filter((i) => i.band === 1).length;
    for (let i = 0; i < bandSize; i++) {
      const q = makeEnglishQuestion(1, rng, i, used);
      expect(used).not.toContain(q.key);
      used.push(q.key);
    }
  });

  it('throws a clear error when a level has no items', () => {
    expect(() => makeEnglishQuestion(3, createRng(1), 1, [], [item('en-1-001', 1)])).toThrow(/level 3/);
  });
});
```

`__tests__/game/subjects-test.ts`:

```ts
import { configForLevel } from '../../src/game/difficulty';
import { englishFallMs } from '../../src/game/english';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';
import { SUBJECT_IDS, SUBJECTS } from '../../src/game/subjects';

describe('SUBJECTS', () => {
  it('lists math then english, each keyed by its own id', () => {
    expect(SUBJECT_IDS).toEqual(['math', 'english']);
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id].id).toBe(id);
    }
  });

  it('shows the names and badges from the spec', () => {
    expect(SUBJECTS.math).toMatchObject({ name: 'Mathematics', shortName: 'MATH', badge: '+−×÷' });
    expect(SUBJECTS.english).toMatchObject({ name: 'English', shortName: 'ENGLISH', badge: 'Aa' });
  });

  it('uses each subject own fall times', () => {
    for (const level of [1, 4, 7, 12]) {
      expect(SUBJECTS.math.fallMs(level)).toBe(configForLevel(level).fallMs);
      expect(SUBJECTS.english.fallMs(level)).toBe(englishFallMs(level));
    }
  });

  it('math makes arithmetic questions and ignores used keys', () => {
    const q = SUBJECTS.math.makeQuestion(1, createRng(1), 5, ['anything']);
    expect(q.id).toBe(5);
    expect(q.prompt).toMatch(/^\d+ \+ \d+$/);
  });

  it('english makes questions from the bank and honours used keys', () => {
    const band1 = ENGLISH_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.english.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- __tests__/game/english-test.ts __tests__/game/subjects-test.ts`
Expected: FAIL. Cannot find module `../../src/game/english` / `../../src/game/subjects`.

- [ ] **Step 3: Implement**

`src/game/english.ts`:

```ts
import { ENGLISH_BANK, type EnglishItem } from './english-bank';
import type { Question } from './question';
import { pick, shuffle, type Rng } from './random';

const BLANK = '___';
const MIN_FALL_MS = 6000;

// Bands 1-5 are used at levels 1-5; from level 6 on, the two hardest bands are pooled.
export function bandsForLevel(level: number): number[] {
  return level >= 6 ? [4, 5] : [Math.max(1, level)];
}

// Reading a sentence takes longer than arithmetic, so English falls more slowly than Math.
export function englishFallMs(level: number): number {
  if (level <= 4) return 13000 - 1000 * Math.max(1, level);
  return Math.max(MIN_FALL_MS, 9000 - 500 * (level - 4));
}

export function makeEnglishQuestion(
  level: number,
  rng: Rng,
  id: number,
  usedKeys: readonly string[],
  bank: readonly EnglishItem[] = ENGLISH_BANK,
): Question {
  const bands = bandsForLevel(level);
  const pool = bank.filter((entry) => bands.includes(entry.band));
  if (pool.length === 0) throw new Error(`No English sentences for level ${level}`);
  // No repeats within a run until the pool is used up; then any item may come back.
  const fresh = pool.filter((entry) => !usedKeys.includes(entry.id));
  const item = pick(rng, fresh.length > 0 ? fresh : pool);
  const [before, after] = item.sentence.split(BLANK);
  return {
    id,
    key: item.id,
    prompt: item.sentence,
    answer: item.answer,
    choices: shuffle(rng, [item.answer, ...item.wrong]),
    reveal: { before, after },
  };
}
```

`src/game/subjects.ts`:

```ts
import { configForLevel } from './difficulty';
import { englishFallMs, makeEnglishQuestion } from './english';
import { makeMathQuestion } from './math';
import type { Question } from './question';
import type { Rng } from './random';

export type SubjectId = 'math' | 'english';

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  badge: string;
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: 'math',
    name: 'Mathematics',
    shortName: 'MATH',
    badge: '+−×÷',
    fallMs: (level) => configForLevel(level).fallMs,
    // Math questions are generated fresh each time, so repeats are fine and usedKeys is ignored.
    makeQuestion: (level, rng, id) => makeMathQuestion(level, rng, id),
  },
  english: {
    id: 'english',
    name: 'English',
    shortName: 'ENGLISH',
    badge: 'Aa',
    fallMs: englishFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeEnglishQuestion(level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english'];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- __tests__/game/english-test.ts __tests__/game/subjects-test.ts`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm test
npx tsc --noEmit
npx expo lint
git add src/game/english.ts src/game/subjects.ts __tests__/game/english-test.ts __tests__/game/subjects-test.ts
git commit -m "feat(game): build English questions and add the subject registry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Reducer — subjects, reveal and quit

Interim state after this task: the reducer reveals on a miss, but nothing dispatches `REVEAL_DONE` until Task 5 wires the reveal timer. So a run pauses at the first landed question. This is expected; Task 5 completes it.

**Files:**
- Modify: `src/game/reducer.ts` (full replacement below)
- Modify: `src/components/game/game-screen.tsx` (one line)
- Test: `__tests__/game/reducer-test.ts` (full replacement below)

**Interfaces:**
- Consumes: `SUBJECTS`, `SubjectId` (Task 3); `Question` (Task 1); `levelForScore`; `pointsFor`; `Rng`
- Produces:
  - `GameState` with the new fields `subject: SubjectId`, `revealing: boolean`, `usedKeys: string[]`
  - `GameAction` with `{ type: 'START'; subject: SubjectId }`, `{ type: 'REVEAL_DONE' }` and `{ type: 'QUIT' }` added; the other actions are unchanged
  - `createInitialState()`, `createGameReducer(rng)`, `STARTING_LIVES`, `Phase` (unchanged names)

- [ ] **Step 1: Write the failing tests**

Replace `__tests__/game/reducer-test.ts` entirely:

```ts
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';
import {
  createGameReducer,
  createInitialState,
  STARTING_LIVES,
  type GameState,
} from '../../src/game/reducer';
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- __tests__/game/reducer-test.ts`
Expected: FAIL. Many tests fail: `subject`, `revealing` and `usedKeys` are missing, QUESTION_HIT spawns instead of revealing, and REVEAL_DONE/QUIT are unknown.

- [ ] **Step 3: Implement the reducer**

Replace `src/game/reducer.ts` entirely:

```ts
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
```

- [ ] **Step 4: Keep the app compiling**

In `src/components/game/game-screen.tsx`, inside `handleStart`, change `dispatch({ type: 'START' });` to:

```ts
    dispatch({ type: 'START', subject: 'math' });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit
npx expo lint
git add src/game/reducer.ts src/components/game/game-screen.tsx __tests__/game/reducer-test.ts
git commit -m "feat(game): reveal missed answers, add subjects and quit to the reducer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The reveal and per-subject cards in the play area

After this task Math plays fully with the reveal. English is reachable only from Task 6's picker.

**Files:**
- Modify: `src/components/game/layout.ts` (full replacement), `src/components/game/colors.ts` (add 3 tokens), `src/components/game/falling-question.tsx` (full replacement), `src/components/game/answer-pad.tsx` (full replacement), `src/components/game/game-screen.tsx` (full replacement)
- Test: `__tests__/components/layout-test.ts`

**Interfaces:**
- Consumes: `Question` (Task 1); `SUBJECTS`, `SubjectId` (Task 3); reducer state `subject`, `revealing` and action `REVEAL_DONE` (Task 4)
- Produces:
  - `HERO_HEIGHT` (unchanged value 76)
  - `cardSizeFor(subject: SubjectId, playAreaWidth: number): { width: number; height: number }`. `CARD_WIDTH` and `CARD_HEIGHT` are removed.
  - `FallingQuestion` props add `subject`, `revealing` and `onRevealed`
  - `AnswerPad` props: `questionId`, `choices: string[]`, `disabledChoices: string[]`, `highlightedChoice: string | null`, `locked`, `onAnswer(value: string)`

- [ ] **Step 1: Write the failing layout test**

`__tests__/components/layout-test.ts`:

```ts
import { cardSizeFor, HERO_HEIGHT } from '../../src/components/game/layout';

describe('cardSizeFor', () => {
  it('keeps the Math card at 168 x 64', () => {
    expect(cardSizeFor('math', 390)).toEqual({ width: 168, height: 64 });
  });

  it('makes the English card nearly full width, capped at 360, and 104 tall', () => {
    expect(cardSizeFor('english', 320)).toEqual({ width: 288, height: 104 });
    expect(cardSizeFor('english', 390)).toEqual({ width: 358, height: 104 });
    expect(cardSizeFor('english', 800)).toEqual({ width: 360, height: 104 });
  });

  it('never returns a negative width before layout', () => {
    expect(cardSizeFor('english', 0).width).toBe(0);
  });

  it('keeps the hero height', () => {
    expect(HERO_HEIGHT).toBe(76);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- __tests__/components/layout-test.ts`
Expected: FAIL. `cardSizeFor` is not a function.

- [ ] **Step 3: Layout and colours**

Replace `src/components/game/layout.ts`:

```ts
import type { SubjectId } from '@/game/subjects';

// Height reserved at the bottom of the play area for the hero; its top is the danger line.
export const HERO_HEIGHT = 76;

export interface CardSize {
  width: number;
  height: number;
}

// Math prompts are short ("12 × 7"); English sentences need a wide card with room for three lines.
export function cardSizeFor(subject: SubjectId, playAreaWidth: number): CardSize {
  if (subject === 'english') {
    return { width: Math.max(0, Math.min(playAreaWidth - 32, 360)), height: 104 };
  }
  return { width: 168, height: 64 };
}
```

In `src/components/game/colors.ts`, add these three entries before `} as const;`:

```ts
  // Revealed answer on the white card: darker than `success` so it stays readable.
  revealText: '#0A8F4E',
  revealButton: '#12382A',
  blank: '#6B7BB8',
```

- [ ] **Step 4: Run the layout test to verify it passes**

Run: `npm test -- __tests__/components/layout-test.ts`
Expected: PASS.

- [ ] **Step 5: Falling question with per-subject card, blank and reveal**

Replace `src/components/game/falling-question.tsx` entirely:

```tsx
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Question } from '@/game/question';
import type { SubjectId } from '@/game/subjects';

import { GameColors } from './colors';
import { cardSizeFor, HERO_HEIGHT } from './layout';

const BULLET_MS = 150;
// Fragments finish at FRAGMENT_END of the break; the remainder is the ~300ms gap before the next question.
const BREAK_MS = 750;
const FRAGMENT_END = 0.6;
const BULLET_HEIGHT = 18;
// How long a missed question's answer stays on show.
const REVEAL_MS = 1500;
const BLANK = '___';
// How the blank looks on the card.
const BLANK_GAP = '_____';
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
  subject: SubjectId;
  fallMs: number;
  paused: boolean;
  destroying: boolean;
  revealing: boolean;
  lastPoints: number;
  progress: SharedValue<number>;
  onHit: () => void;
  onDestroyed: () => void;
  onRevealed: () => void;
}

export function FallingQuestion({
  question,
  subject,
  fallMs,
  paused,
  destroying,
  revealing,
  lastPoints,
  progress,
  onHit,
  onDestroyed,
  onRevealed,
}: FallingQuestionProps) {
  const [playArea, setPlayArea] = useState({ width: 0, height: 0 });
  const bullet = useSharedValue(0);
  const shatter = useSharedValue(0);
  const reveal = useSharedValue(0);
  // Id of the question whose fall was last started; tells a fresh question from a resume.
  const startedIdRef = useRef<number | null>(null);
  const questionId = question?.id ?? null;
  const card = cardSizeFor(subject, playArea.width);
  const cardHeight = card.height;
  const playHeight = playArea.height;
  const travel = Math.max(0, playHeight - HERO_HEIGHT - cardHeight);
  const heroTop = Math.max(0, playHeight - HERO_HEIGHT);

  // New question: back to the top, clear bullet/shatter/reveal. These sets are only queued to the UI
  // runtime, so progress.get() can still return the previous question's value in the same commit.
  // The fall effect therefore never reads progress for a fresh question (see startedIdRef).
  // Keep this effect declared ABOVE the fall effect: effects run in declaration order, so its
  // queued set(0) must reach the UI runtime before the fall's queued withTiming. Swapped, the
  // reset lands after the fall starts and freezes the card, or a stale value causes an extra hit.
  useEffect(() => {
    progress.set(0);
    bullet.set(0);
    shatter.set(0);
    reveal.set(0);
  }, [questionId, progress, bullet, shatter, reveal]);

  // Fall for the full fallMs when the question is new, or resume for whatever time is left when
  // it is the same question after a pause; freeze on pause, when shot, or while its answer is
  // revealed. The queued reset above runs before the queued timing below, so a fresh fall starts from 0.
  // The fall, bullet, shatter and reveal are game timing, not decoration, so they opt out of the OS
  // reduce-motion setting (reduceMotion: ReduceMotion.Never). With the default, Reanimated jumps
  // to the end and reports finished on the first frame, so every question would land instantly.
  useEffect(() => {
    if (questionId === null || paused || destroying || revealing || playHeight === 0) return;
    const fresh = questionId !== startedIdRef.current;
    startedIdRef.current = questionId;
    const remaining = fresh ? fallMs : Math.max(0, fallMs * (1 - progress.get()));
    progress.set(
      withTiming(1, { duration: remaining, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (finished) scheduleOnRN(onHit);
      }),
    );
    return () => cancelAnimation(progress);
  }, [questionId, paused, destroying, revealing, playHeight, fallMs, progress, onHit]);

  // Correct answer: bullet flies up, then the card shatters, then report back.
  useEffect(() => {
    if (!destroying) return;
    bullet.set(
      withTiming(1, { duration: BULLET_MS, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (!finished) return;
        shatter.set(
          withTiming(1, { duration: BREAK_MS, reduceMotion: ReduceMotion.Never }, (done) => {
            if (done) scheduleOnRN(onDestroyed);
          }),
        );
      }),
    );
  }, [destroying, bullet, shatter, onDestroyed]);

  // A miss: keep the answer on show for REVEAL_MS, then report back. Like the shatter, it keeps
  // running through a pause.
  useEffect(() => {
    if (!revealing) return;
    reveal.set(
      withTiming(1, { duration: REVEAL_MS, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (finished) scheduleOnRN(onRevealed);
      }),
    );
  }, [revealing, reveal, onRevealed]);

  const cardStyle = useAnimatedStyle(() => ({
    // Hidden while shattering, and once landed unless its answer is being revealed, so a new
    // question's text never shows at the hero for the frame(s) before the queued progress reset arrives.
    opacity: shatter.get() > 0 || (progress.get() >= 1 && !revealing) ? 0 : 1,
    transform: [{ translateY: progress.get() * travel }],
  }));

  const bulletStyle = useAnimatedStyle(() => {
    const b = bullet.get();
    const start = heroTop - BULLET_HEIGHT;
    const target = progress.get() * travel + cardHeight;
    return {
      opacity: b > 0 && b < 1 ? 1 : 0,
      transform: [{ translateY: start - b * (start - target) }],
    };
  });

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * travel + cardHeight / 2 }],
  }));

  const pointsStyle = useAnimatedStyle(() => {
    const s = shatter.get();
    return { opacity: s > 0 ? 1 - s : 0, transform: [{ translateY: -60 * s }] };
  });

  return (
    <View
      style={styles.root}
      onLayout={(e) => setPlayArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {question && (
        <>
          <Animated.View style={[styles.cardLane, cardStyle]}>
            <View style={[styles.card, { width: card.width, height: cardHeight }]}>
              <CardText question={question} subject={subject} revealing={revealing} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.bullet, bulletStyle]} />
          <Animated.View style={[styles.burst, burstStyle]}>
            {FRAGMENTS.map((f, i) => (
              <Fragment key={i} shatter={shatter} {...f} />
            ))}
            <Animated.Text style={[styles.points, pointsStyle]} maxFontSizeMultiplier={1.4}>
              +{lastPoints}
            </Animated.Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

interface CardTextProps {
  question: Question;
  subject: SubjectId;
  revealing: boolean;
}

// The prompt (English shows its blank as a gap), or on a miss the full answer with the answer highlighted.
function CardText({ question, subject, revealing }: CardTextProps) {
  const english = subject === 'english';
  const [before, after] = revealing
    ? [question.reveal.before, question.reveal.after]
    : english
      ? question.prompt.split(BLANK)
      : [question.prompt, ''];
  return (
    <Text
      style={english ? styles.sentenceText : styles.cardText}
      numberOfLines={english ? 3 : 1}
      adjustsFontSizeToFit
      minimumFontScale={english ? 0.6 : 0.5}
      maxFontSizeMultiplier={1.4}>
      {before}
      {revealing ? (
        <Text style={styles.revealAnswer}>{question.answer}</Text>
      ) : english ? (
        <Text style={styles.blank}>{BLANK_GAP}</Text>
      ) : null}
      {after}
    </Text>
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
  root: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  cardLane: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
  sentenceText: {
    fontSize: 22,
    fontWeight: '700',
    color: GameColors.cardText,
    textAlign: 'center',
  },
  revealAnswer: { color: GameColors.revealText, fontWeight: '900' },
  blank: { color: GameColors.blank, fontWeight: '800' },
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

- [ ] **Step 6: Answer pad with text choices and the reveal highlight**

Replace `src/components/game/answer-pad.tsx` entirely:

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
  choices: string[];
  disabledChoices: string[];
  // The correct choice while a missed question's answer is revealed.
  highlightedChoice: string | null;
  locked: boolean;
  onAnswer: (value: string) => void;
}

export function AnswerPad({
  questionId,
  choices,
  disabledChoices,
  highlightedChoice,
  locked,
  onAnswer,
}: AnswerPadProps) {
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
              highlighted={value === highlightedChoice}
              locked={locked}
              onPress={onAnswer}
            />
          ))}
    </View>
  );
}

interface AnswerButtonProps {
  value: string;
  wrong: boolean;
  highlighted: boolean;
  locked: boolean;
  onPress: (value: string) => void;
}

function AnswerButton({ value, wrong, highlighted, locked, onPress }: AnswerButtonProps) {
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
        style={({ pressed }) => [
          styles.button,
          wrong && styles.wrong,
          highlighted && styles.correct,
          pressed && styles.pressed,
        ]}>
        <Text
          style={[styles.label, wrong && styles.wrongLabel, highlighted && styles.correctLabel]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          maxFontSizeMultiplier={1.4}>
          {value}
        </Text>
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
    paddingHorizontal: 8,
  },
  placeholder: { opacity: 0.4 },
  pressed: { borderColor: GameColors.glow, transform: [{ scale: 0.97 }] },
  wrong: { borderColor: GameColors.danger, backgroundColor: '#3A1426' },
  correct: { borderColor: GameColors.success, backgroundColor: GameColors.revealButton },
  label: {
    fontSize: 28,
    fontWeight: '800',
    color: GameColors.text,
    fontVariant: ['tabular-nums'],
  },
  wrongLabel: { color: GameColors.danger },
  correctLabel: { color: GameColors.success },
});
```

- [ ] **Step 7: Game screen wiring (subject timing, reveal)**

Replace `src/components/game/game-screen.tsx` entirely (the subject picker arrives in Task 6, so Play still starts Math):

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

import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { SUBJECTS } from '@/game/subjects';
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
  // Best when the run began. It can be stale if the stored best finished loading after Play was
  // pressed, so "New best!" also requires the score to reach the live best (see isNewBest below).
  const [bestAtStart, setBestAtStart] = useState(0);
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);
  const {
    phase,
    subject,
    score,
    level,
    lives,
    question,
    disabledChoices,
    destroying,
    revealing,
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
    dispatch({ type: 'START', subject: 'math' });
  }, [best]);

  const handleAnswer = useCallback(
    (value: string) => {
      if (!question) return;
      // The reducer ignores taps while paused, shattering or revealing, so don't buzz for them either.
      if (phase === 'playing' && !destroying && !revealing && value === question.answer) {
        haptic(Haptics.ImpactFeedbackStyle.Light);
      }
      // Tagged with the tapped question's id so the reducer can drop a tap that lands after it was replaced.
      dispatch({ type: 'ANSWER', questionId: question.id, value, progress: progress.get() });
    },
    [phase, destroying, revealing, question, progress],
  );

  // Stable identities matter: FallingQuestion restarts its fall when these change.
  const handleHit = useCallback(() => dispatch({ type: 'QUESTION_HIT' }), []);
  const handleDestroyed = useCallback(() => dispatch({ type: 'DESTROY_DONE' }), []);
  const handleRevealed = useCallback(() => dispatch({ type: 'REVEAL_DONE' }), []);
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
            subject={subject}
            fallMs={SUBJECTS[subject].fallMs(level)}
            paused={phase !== 'playing'}
            destroying={destroying}
            revealing={revealing}
            lastPoints={lastPoints}
            progress={progress}
            onHit={handleHit}
            onDestroyed={handleDestroyed}
            onRevealed={handleRevealed}
          />
          <Hero firing={destroying} hitCount={hitCount} />
        </Animated.View>
        <AnswerPad
          questionId={question?.id ?? null}
          choices={question?.choices ?? []}
          disabledChoices={disabledChoices}
          highlightedChoice={revealing && question ? question.answer : null}
          locked={phase !== 'playing' || destroying || revealing}
          onAnswer={handleAnswer}
        />
      </SafeAreaView>
      <Overlay
        phase={phase}
        score={score}
        best={best}
        isNewBest={phase === 'gameover' && score > bestAtStart && score >= best}
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

- [ ] **Step 8: Verify and commit**

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo export --platform web --output-dir "$TMP/qs-web-t5"
git add src/components/game/layout.ts src/components/game/colors.ts src/components/game/falling-question.tsx src/components/game/answer-pad.tsx src/components/game/game-screen.tsx __tests__/components/layout-test.ts
git commit -m "feat: reveal missed answers on the card and answer pad, size cards per subject

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: all pass. The web export succeeds (its output goes outside the repo, so don't commit it). Do not start a dev server.

---

### Task 6: Subject picker, menus and per-subject best scores

**Files:**
- Create: `src/hooks/best-score-keys.ts`
- Rename + modify: `src/hooks/use-best-score.ts` → `src/hooks/use-best-scores.ts`
- Modify: `src/components/game/overlay.tsx` (full), `src/components/game/hud.tsx` (full), `src/components/game/game-screen.tsx` (full)
- Test: `__tests__/hooks/best-score-keys-test.ts`

**Interfaces:**
- Consumes: `SUBJECTS`, `SUBJECT_IDS`, `SubjectId` (Task 3); reducer `START {subject}` / `QUIT` (Task 4); Task 5's `FallingQuestion` / `AnswerPad` props
- Produces:
  - `BEST_SCORE_KEYS: Record<SubjectId, string>`
  - `type BestScores = Record<SubjectId, number>`
  - `useBestScores(): { best: BestScores; submit: (subject: SubjectId, score: number) => void }`
  - `Overlay` props: `{ phase, subject, score, best: BestScores, isNewBest, onStart(subject), onResume, onMenu }`
  - `Hud` props add `subject`

- [ ] **Step 1: Write the failing test**

`__tests__/hooks/best-score-keys-test.ts`:

```ts
import { BEST_SCORE_KEYS } from '../../src/hooks/best-score-keys';

describe('BEST_SCORE_KEYS', () => {
  it('keeps the original Math key so saved bests carry over', () => {
    expect(BEST_SCORE_KEYS.math).toBe('quiz-shooter:best-score');
  });

  it('gives English its own key', () => {
    expect(BEST_SCORE_KEYS.english).toBe('quiz-shooter:best-score:english');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- __tests__/hooks/best-score-keys-test.ts`
Expected: FAIL. Cannot find module `../../src/hooks/best-score-keys`.

- [ ] **Step 3: Keys and the per-subject hook**

`src/hooks/best-score-keys.ts`:

```ts
import type { SubjectId } from '@/game/subjects';

// Math keeps the original key so bests saved before English existed carry over.
export const BEST_SCORE_KEYS: Record<SubjectId, string> = {
  math: 'quiz-shooter:best-score',
  english: 'quiz-shooter:best-score:english',
};
```

```bash
git mv src/hooks/use-best-score.ts src/hooks/use-best-scores.ts
```

Replace `src/hooks/use-best-scores.ts` entirely:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SUBJECT_IDS, type SubjectId } from '@/game/subjects';

import { BEST_SCORE_KEYS } from './best-score-keys';

export type BestScores = Record<SubjectId, number>;

// Storage failures are swallowed: the game keeps working with the in-memory bests.
export function useBestScores() {
  const [best, setBest] = useState<BestScores>({ math: 0, english: 0 });

  useEffect(() => {
    let cancelled = false;
    for (const subject of SUBJECT_IDS) {
      AsyncStorage.getItem(BEST_SCORE_KEYS[subject])
        .then((raw) => {
          const stored = Number(raw);
          if (!cancelled && Number.isFinite(stored) && stored > 0) {
            setBest((current) => ({ ...current, [subject]: Math.max(current[subject], stored) }));
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(
    (subject: SubjectId, score: number) => {
      if (score <= best[subject]) return;
      setBest((current) => ({ ...current, [subject]: Math.max(current[subject], score) }));
      AsyncStorage.setItem(BEST_SCORE_KEYS[subject], String(score)).catch(() => {});
    },
    [best],
  );

  return { best, submit };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- __tests__/hooks/best-score-keys-test.ts`
Expected: PASS.

- [ ] **Step 5: Overlay with the subject picker and menus**

Replace `src/components/game/overlay.tsx` entirely:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Phase } from '@/game/reducer';
import { SUBJECT_IDS, SUBJECTS, type SubjectId } from '@/game/subjects';
import type { BestScores } from '@/hooks/use-best-scores';

import { GameColors } from './colors';

interface OverlayProps {
  phase: Phase;
  subject: SubjectId;
  score: number;
  best: BestScores;
  isNewBest: boolean;
  onStart: (subject: SubjectId) => void;
  onResume: () => void;
  // Pause → Menu and Game over → Change subject: back to the subject picker.
  onMenu: () => void;
}

export function Overlay({ phase, subject, score, best, isNewBest, onStart, onResume, onMenu }: OverlayProps) {
  if (phase === 'playing') return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        {phase === 'ready' && (
          <>
            <Text style={styles.title}>Quiz Shooter</Text>
            <Text style={styles.subtitle}>Pick your subject</Text>
            {SUBJECT_IDS.map((id) => (
              <SubjectButton key={id} subject={id} best={best[id]} onPress={() => onStart(id)} />
            ))}
          </>
        )}
        {phase === 'paused' && (
          <>
            <Text style={styles.title}>Paused</Text>
            <PrimaryButton label="Resume" onPress={onResume} />
            <SecondaryButton label="Menu" onPress={onMenu} />
          </>
        )}
        {phase === 'gameover' && (
          <>
            <Text style={styles.title}>Game Over</Text>
            {isNewBest && <Text style={styles.badge}>New best!</Text>}
            <Text style={styles.stat}>Score {score}</Text>
            <Text style={styles.statDim}>Best {best[subject]}</Text>
            <PrimaryButton label="Play again" onPress={() => onStart(subject)} />
            <SecondaryButton label="Change subject" onPress={onMenu} />
          </>
        )}
      </View>
    </View>
  );
}

function SubjectButton({ subject, best, onPress }: { subject: SubjectId; best: number; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, best ${best}`}
      style={({ pressed }) => [styles.subjectButton, pressed && styles.pressed]}>
      <Text style={styles.subjectBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <View style={styles.subjectText}>
        <Text style={styles.subjectName}>{name}</Text>
        <Text style={styles.subjectBest}>Best {best}</Text>
      </View>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
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
  subtitle: { fontSize: 15, color: GameColors.textDim, textAlign: 'center', marginBottom: 4 },
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
  subjectButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
  },
  subjectBadge: { width: 64, textAlign: 'center', fontSize: 22, fontWeight: '900', color: GameColors.glow },
  subjectText: { flex: 1 },
  subjectName: { fontSize: 22, fontWeight: '800', color: GameColors.text },
  subjectBest: { fontSize: 14, color: GameColors.textDim },
  button: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    backgroundColor: GameColors.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 20, fontWeight: '800', color: GameColors.background },
  secondaryButton: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: 18, fontWeight: '700', color: GameColors.text },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
```

- [ ] **Step 6: HUD with the subject label**

Replace `src/components/game/hud.tsx` entirely:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STARTING_LIVES } from '@/game/reducer';
import { SUBJECTS, type SubjectId } from '@/game/subjects';

import { GameColors } from './colors';

interface HudProps {
  subject: SubjectId;
  lives: number;
  level: number;
  score: number;
  canPause: boolean;
  onPause: () => void;
}

export function Hud({ subject, lives, level, score, canPause, onPause }: HudProps) {
  return (
    <View style={styles.hud}>
      <View style={styles.side}>
        {Array.from({ length: STARTING_LIVES }, (_, i) => (
          <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]} maxFontSizeMultiplier={1.4}>
            ♥
          </Text>
        ))}
      </View>
      {/* Subject on its own small line so "ENGLISH" + level fits a 320 px-wide screen. */}
      <View style={styles.center}>
        <Text style={styles.subject} maxFontSizeMultiplier={1.2}>
          {SUBJECTS[subject].shortName}
        </Text>
        <Text style={styles.level} maxFontSizeMultiplier={1.4}>
          LV {level}
        </Text>
      </View>
      <View style={[styles.side, styles.right]}>
        <Text style={styles.score} maxFontSizeMultiplier={1.4}>
          {score}
        </Text>
        <Pressable
          onPress={onPause}
          disabled={!canPause}
          hitSlop={12}
          accessibilityLabel="Pause"
          style={[styles.pause, !canPause && styles.hidden]}>
          <Text style={styles.pauseLabel} maxFontSizeMultiplier={1.4}>
            II
          </Text>
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
  center: { alignItems: 'center' },
  heart: { fontSize: 22, color: GameColors.danger },
  heartLost: { color: GameColors.buttonBorder },
  subject: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GameColors.textDim },
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

- [ ] **Step 7: Game screen (final)**

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

import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { SUBJECTS, type SubjectId } from '@/game/subjects';
import { useBestScores } from '@/hooks/use-best-scores';

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
  const { best, submit } = useBestScores();
  // This subject's best when the run began. It can be stale if the stored best finished loading
  // after the run started, so "New best!" also requires the score to reach the live best.
  const [bestAtStart, setBestAtStart] = useState(0);
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);
  const {
    phase,
    subject,
    score,
    level,
    lives,
    question,
    disabledChoices,
    destroying,
    revealing,
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
    if (phase === 'gameover') submit(subject, score);
  }, [phase, subject, score, submit]);

  const handleStart = useCallback(
    (next: SubjectId) => {
      setBestAtStart(best[next]);
      dispatch({ type: 'START', subject: next });
    },
    [best],
  );

  // Leaving mid-run still counts the run's score toward this subject's best.
  const handleMenu = useCallback(() => {
    submit(subject, score);
    dispatch({ type: 'QUIT' });
  }, [subject, score, submit]);

  const handleAnswer = useCallback(
    (value: string) => {
      if (!question) return;
      // The reducer ignores taps while paused, shattering or revealing, so don't buzz for them either.
      if (phase === 'playing' && !destroying && !revealing && value === question.answer) {
        haptic(Haptics.ImpactFeedbackStyle.Light);
      }
      // Tagged with the tapped question's id so the reducer can drop a tap that lands after it was replaced.
      dispatch({ type: 'ANSWER', questionId: question.id, value, progress: progress.get() });
    },
    [phase, destroying, revealing, question, progress],
  );

  // Stable identities matter: FallingQuestion restarts its fall when these change.
  const handleHit = useCallback(() => dispatch({ type: 'QUESTION_HIT' }), []);
  const handleDestroyed = useCallback(() => dispatch({ type: 'DESTROY_DONE' }), []);
  const handleRevealed = useCallback(() => dispatch({ type: 'REVEAL_DONE' }), []);
  const handlePause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const handleResume = useCallback(() => dispatch({ type: 'RESUME' }), []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Hud
          subject={subject}
          lives={lives}
          level={level}
          score={score}
          canPause={phase === 'playing'}
          onPause={handlePause}
        />
        <Animated.View style={[styles.playArea, shakeStyle]}>
          <FallingQuestion
            question={question}
            subject={subject}
            fallMs={SUBJECTS[subject].fallMs(level)}
            paused={phase !== 'playing'}
            destroying={destroying}
            revealing={revealing}
            lastPoints={lastPoints}
            progress={progress}
            onHit={handleHit}
            onDestroyed={handleDestroyed}
            onRevealed={handleRevealed}
          />
          <Hero firing={destroying} hitCount={hitCount} />
        </Animated.View>
        <AnswerPad
          questionId={question?.id ?? null}
          choices={question?.choices ?? []}
          disabledChoices={disabledChoices}
          highlightedChoice={revealing && question ? question.answer : null}
          locked={phase !== 'playing' || destroying || revealing}
          onAnswer={handleAnswer}
        />
      </SafeAreaView>
      <Overlay
        phase={phase}
        subject={subject}
        score={score}
        best={best}
        isNewBest={phase === 'gameover' && score > bestAtStart && score >= best[subject]}
        onStart={handleStart}
        onResume={handleResume}
        onMenu={handleMenu}
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

- [ ] **Step 8: Verify and commit**

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo export --platform web --output-dir "$TMP/qs-web-t6"
git add src/hooks/best-score-keys.ts src/hooks/use-best-scores.ts src/components/game/overlay.tsx src/components/game/hud.tsx src/components/game/game-screen.tsx __tests__/hooks/best-score-keys-test.ts
git commit -m "feat: add the subject picker, pause menu and per-subject best scores

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: all pass; the web export succeeds (output outside the repo). No dev server. Step 3's `git mv` already staged the rename, so don't `git add` the old `use-best-score.ts` path (git rejects paths that no longer exist).

---

### Task 7: Final verification

**Files:** none expected. Fix anything the checks report inside the file that owns it.

- [ ] **Step 1: Run the full check suite**

```bash
npx expo-doctor
npx expo lint
npx tsc --noEmit
npm test
```

Expected: every command exits 0.

`expo-doctor` may report the user's uncommitted `app.json`/`package.json` edits, e.g. the scripts. Report such findings; don't change or commit those files.

- [ ] **Step 2: Device check (human)**

Ask the user to run `npx expo start`, open Expo Go on a phone, and check:
- The subject picker shows both subjects with their bests, and the Math best from before the update is still there.
- **Math:** plays as before. Letting a card land shows `a op b = answer` with the answer in green, and the matching button turns green, for about 1.5 s.
- **English:**
  - Sentences fit on the card on a small phone and at the largest text size.
  - The blank is visible.
  - A landed sentence reveals the completed sentence.
  - A third wrong tap reveals the answer, then shows Game Over.
- **Menus:**
  - Pause → Menu returns to the picker and keeps a new best.
  - Game Over → Play again (same subject) and Change subject both work.
  - Backgrounding the app during a reveal doesn't freeze the game.
- A brief blink at the moment a card lands, just before its reveal appears, is expected. It is masked by the screen shake.

- [ ] **Step 3: Commit any fixes**

Stage explicit paths only. Skip this commit if nothing changed.

```bash
git add <the files you changed>
git commit -m "chore: fix issues found in final verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
