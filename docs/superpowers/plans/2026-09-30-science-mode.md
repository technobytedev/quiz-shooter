# Science Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Science as a third subject. It uses fill-in-the-blank facts with four choices, using the same shooter mechanics and reveal as English.

**Architecture:**
- English's sentence engine (`english.ts`) becomes a shared, neutrally named `bank.ts`. English and Science are each a data file plus a registry entry.
- Each subject declares a `card` kind (`'short' | 'sentence'`). The UI reads it instead of checking `subject === 'english'`, a check that would silently give Science the small one-line Math card.
- The reducer, scoring, levels, HUD and answer pad do not change.

**Tech Stack:** Expo SDK 57, Expo Router, React 19.2 (React Compiler on), React Native 0.86, Reanimated 4.5, jest-expo, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-09-30-science-mode-design.md`. It builds on `docs/superpowers/specs/2026-09-29-english-mode-design.md`.

## Global Constraints

- **No new packages.** If one ever seems needed, stop and report. This plan uses no new Expo or React Native APIs; `maxFontSizeMultiplier` is already used in the files it touches.
- `src/game/**` must not import React, React Native, or Expo modules.
- Tests live in `__tests__/` (subfolders allowed) and are named `*-test.ts`. They import source by relative path. Files they import may use `@/…` only as `import type`, which is erased at test time.
- **Renames use `git mv`** so history follows:
  - `src/game/english.ts` → `src/game/bank.ts`
  - `__tests__/game/english-test.ts` → `__tests__/game/bank-test.ts`
  - `__tests__/game/english-bank-test.ts` → `__tests__/game/bank-content-test.ts`
- **Best-score storage keys:**
  - Math: `quiz-shooter:best-score` (unchanged)
  - English: `quiz-shooter:best-score:english` (unchanged)
  - Science: `quiz-shooter:best-score:science` (new)
- **Science subject:**
  - id `science`, name `Science`, shortName `SCIENCE`, badge `H₂O`
  - card `sentence`, fall time `sentenceFallMs`
  - picker order `['math', 'english', 'science']`
- **`sentenceFallMs` keeps today's `englishFallMs` values:** 12000 / 11000 / 10000 / 9000 ms at levels 1–4, then `9000 − 500·(level − 4)`, never below 6000 ms.
- **Bank rules checked by tests (both banks, spec §2):**
  - Exactly one `___` in the sentence and no `____`.
  - The sentence is trimmed, ends with `.`, `?` or `!`, and is **≤ 60 characters**.
  - Exactly 3 wrong choices. All 4 choices are distinct, including case-insensitively.
  - Each choice is non-empty, trimmed, 1–3 words and **≤ 16 characters**.
  - When the blank starts the sentence, every choice is capitalised.
  - Ids are unique and match `^<prefix>-<band>-\d{3}$` (prefix `en` or `sci`).
  - No duplicate sentences. At least 35 items per band.
- **Science content rules checked by a person (spec §2):**
  - Exactly one true choice. The wrong choices are clearly false but from the same category.
  - True as written at school level; qualify where needed.
  - No facts that change over time, and no popular myths.
  - Digits for numbers, metric units, subscript formulas (H₂O), American spelling.
  - Suitable for all ages.
- In `falling-question.tsx`, the reset effect **must stay declared above** the fall effect (the queued `set(0)` ordering is load-bearing). This plan only renames things in that file; do not reorder or rewrite effects.
- Work on branch `feat/science-mode`. Always `git add` explicit paths; never `git add -A` or `git add .`.
- Commit messages end with a blank line, then exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Done means `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass.

## Review Focus

1. **A Science fact that is wrong, or that has two true choices.** The player would be marked wrong for a right answer, or the reveal would teach something false. No unit test can judge truth.
   - Task 3's review **is** the spec §2 content review. It must read all 200 items against the person-checked rules.
   - Task 3's tests pin everything that can be checked mechanically.
2. **English behaving differently after the rename.** `makeBankQuestion` must use the RNG exactly as `makeEnglishQuestion` did (`pick`, then `shuffle`) so seeded runs don't change.
   - Tests: Task 1's `bank-test.ts` with the English bank, and the unchanged English cases in `reducer-test.ts`.
3. **Science silently getting the Math card.** Task 2 routes the card look through `CardKind`, and Task 4 declares Science a `sentence` subject.
   - Tests: `layout-test.ts`, and the card-kind test in `subjects-test.ts`.
4. **Upgrading players losing their saved bests.** The Math and English keys must not change.
   - Test: `best-score-keys-test.ts`.
5. **The effect order in `falling-question.tsx`.** Task 2 edits this file for renames only. The reset effect must still come before the fall effect.

## Plan decisions not spelled out in the spec

- `FallingQuestion` gets a `card: CardKind` prop, so its local card-size variable is renamed from `card` to `cardSize`.
- `bank-test.ts` runs the generic engine checks on a tiny fake bank (`x-…` ids). The real-bank checks run over a `BANKS` table: English in Task 1, with Science added in Task 3.
- `bank-content-test.ts` runs the content rules over a `[name, idPrefix, bank]` table.
- All 200 Science items are fixed in this plan (Task 3). They have already been run through every rule the tests check:
  - longest sentence: 59 characters
  - longest choice: 16 characters
  - longest sentence with the answer filled in: 65 characters

## File Map

| File | Task | Responsibility |
|---|---|---|
| `src/game/bank.ts` (from `english.ts`) | 1 | `BankItem`, `bandsForLevel`, `sentenceFallMs`, `makeBankQuestion` |
| `src/game/english-bank.ts` | 1, 3 | `ENGLISH_BANK` typed as `BankItem[]`; rules comment |
| `src/game/subjects.ts` | 1, 2, 4 | `SubjectId`, `CardKind`, `Subject`, `SUBJECTS`, `SUBJECT_IDS` |
| `src/components/game/layout.ts` | 2 | `cardSizeFor(card, width)` |
| `src/components/game/falling-question.tsx` | 2 | `card` prop replaces `subject` |
| `src/components/game/game-screen.tsx` | 2 | Passes the subject's card kind |
| `src/game/science-bank.ts` | 3 | `SCIENCE_BANK` (200 items) |
| `src/hooks/best-score-keys.ts` | 4 | Science storage key |
| `src/hooks/use-best-scores.ts` | 4 | `science: 0` initial best |
| `src/components/game/overlay.tsx` | 4 | Font-scale cap on subject button text |
| `README.md` | 4 | Describes all three subjects |
| `__tests__/game/bank-test.ts` (from `english-test.ts`) | 1, 3 | Engine tests |
| `__tests__/game/bank-content-test.ts` (from `english-bank-test.ts`) | 3 | Content rules for both banks |
| `__tests__/game/subjects-test.ts` | 1, 2, 4 | Registry tests |
| `__tests__/components/layout-test.ts` | 2 | Card sizes by kind |
| `__tests__/hooks/best-score-keys-test.ts` | 4 | Storage keys |
| `__tests__/game/reducer-test.ts` | 4 | START with Science |

---

### Task 1: Shared sentence engine (`english.ts` → `bank.ts`)

A behaviour-preserving refactor. English plays exactly as before.

**Files:**
- Rename: `src/game/english.ts` → `src/game/bank.ts` (`git mv`), then rewrite
- Rename: `__tests__/game/english-test.ts` → `__tests__/game/bank-test.ts` (`git mv`), then rewrite
- Modify: `src/game/english-bank.ts:1-8,15`
- Modify: `src/game/subjects.ts`
- Modify: `__tests__/game/subjects-test.ts:2,23`

**Interfaces:**
- Produces (in `src/game/bank.ts`):
  - `interface BankItem { id: string; band: 1 | 2 | 3 | 4 | 5; sentence: string; answer: string; wrong: [string, string, string] }`
  - `bandsForLevel(level: number): number[]`, unchanged
  - `sentenceFallMs(level: number): number`, the old `englishFallMs`
  - `makeBankQuestion(bank: readonly BankItem[], level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question`, which throws `Error('No questions for level N')` when the level has no items
- Removes: `EnglishItem`, `englishFallMs`, `makeEnglishQuestion`

- [ ] **Step 1: Rename the files**

```bash
git mv src/game/english.ts src/game/bank.ts
git mv __tests__/game/english-test.ts __tests__/game/bank-test.ts
```

- [ ] **Step 2: Write the failing test**

Replace the whole of `__tests__/game/bank-test.ts` with:

```ts
import { bandsForLevel, makeBankQuestion, sentenceFallMs, type BankItem } from '../../src/game/bank';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';

function item(id: string, band: BankItem['band']): BankItem {
  return { id, band, sentence: `Sentence ${id} has a ___ here.`, answer: 'right', wrong: ['wrong1', 'wrong2', 'wrong3'] };
}

// Every real bank must build valid questions with the shared engine.
const BANKS: [string, readonly BankItem[]][] = [['English', ENGLISH_BANK]];

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

describe('sentenceFallMs', () => {
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
    expect(sentenceFallMs(level)).toBe(ms);
  });
});

describe('makeBankQuestion', () => {
  it('does not always put the answer first', () => {
    const bank = [item('x-1-001', 1)];
    const positions = new Set(
      Array.from({ length: 50 }, (_, seed) => {
        const q = makeBankQuestion(bank, 1, createRng(seed + 1), 1, []);
        return q.choices.indexOf(q.answer);
      }),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a seed', () => {
    const bank = [item('x-1-001', 1), item('x-1-002', 1), item('x-1-003', 1)];
    expect(makeBankQuestion(bank, 1, createRng(42), 1, [])).toEqual(makeBankQuestion(bank, 1, createRng(42), 1, []));
  });

  it('avoids used items until the pool runs out, then reuses them', () => {
    const bank = [item('x-1-001', 1), item('x-1-002', 1), item('x-1-003', 1), item('x-2-001', 2)];
    const rng = createRng(7);
    const used: string[] = [];
    for (let i = 0; i < 3; i++) {
      used.push(makeBankQuestion(bank, 1, rng, i, used).key);
    }
    expect([...used].sort()).toEqual(['x-1-001', 'x-1-002', 'x-1-003']);
    // Every band-1 item has been used: the next pick reuses one instead of failing.
    expect(used).toContain(makeBankQuestion(bank, 1, rng, 3, used).key);
  });

  it('throws a clear error when a level has no items', () => {
    expect(() => makeBankQuestion([item('x-1-001', 1)], 3, createRng(1), 1, [])).toThrow(/level 3/);
  });
});

describe.each(BANKS)('makeBankQuestion with the %s bank', (_name, bank) => {
  it('builds a question from an item in the level band', () => {
    for (let level = 1; level <= 8; level++) {
      for (let seed = 1; seed <= 50; seed++) {
        const q = makeBankQuestion(bank, level, createRng(seed), 9, []);
        const source = bank.find((i) => i.id === q.key);
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

  it('never repeats a sentence while fresh ones remain in band 1', () => {
    const rng = createRng(3);
    const used: string[] = [];
    const bandSize = bank.filter((i) => i.band === 1).length;
    for (let i = 0; i < bandSize; i++) {
      const q = makeBankQuestion(bank, 1, rng, i, used);
      expect(used).not.toContain(q.key);
      used.push(q.key);
    }
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- __tests__/game/bank-test.ts`
Expected: FAIL. The `sentenceFallMs` and `makeBankQuestion` tests throw `TypeError: (0 , _bank.sentenceFallMs) is not a function` / `(0 , _bank.makeBankQuestion) is not a function`. `bank.ts` still holds the old English code. The `bandsForLevel` cases pass.

- [ ] **Step 4: Write the shared engine**

Replace the whole of `src/game/bank.ts` with:

```ts
import type { Question } from './question';
import { pick, shuffle, type Rng } from './random';

// One fill-in-the-blank item in a subject's bank (English grammar, Science facts).
export interface BankItem {
  id: string;
  band: 1 | 2 | 3 | 4 | 5;
  // Contains exactly one "___" (three underscores): the blank.
  sentence: string;
  answer: string;
  wrong: [string, string, string];
}

const BLANK = '___';
const MIN_FALL_MS = 6000;

// Bands 1-5 are used at levels 1-5; from level 6 on, the two hardest bands are pooled.
export function bandsForLevel(level: number): number[] {
  return level >= 6 ? [4, 5] : [Math.max(1, level)];
}

// Reading a sentence takes longer than arithmetic, so sentence subjects fall more slowly than Math.
export function sentenceFallMs(level: number): number {
  if (level <= 4) return 13000 - 1000 * Math.max(1, level);
  return Math.max(MIN_FALL_MS, 9000 - 500 * (level - 4));
}

export function makeBankQuestion(
  bank: readonly BankItem[],
  level: number,
  rng: Rng,
  id: number,
  usedKeys: readonly string[],
): Question {
  const bands = bandsForLevel(level);
  const pool = bank.filter((entry) => bands.includes(entry.band));
  if (pool.length === 0) throw new Error(`No questions for level ${level}`);
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

- [ ] **Step 5: Type the English bank with `BankItem`**

In `src/game/english-bank.ts`, replace the interface at the top of the file:

```ts
export interface EnglishItem {
  id: string;
  band: 1 | 2 | 3 | 4 | 5;
  // Contains exactly one "___" (three underscores): the blank.
  sentence: string;
  answer: string;
  wrong: [string, string, string];
}
```

with:

```ts
import type { BankItem } from './bank';
```

Then replace:

```ts
export const ENGLISH_BANK: readonly EnglishItem[] = [
```

with:

```ts
export const ENGLISH_BANK: readonly BankItem[] = [
```

Leave the rules comment and all 200 items untouched.

- [ ] **Step 6: Point the English subject at the shared engine**

Replace the whole of `src/game/subjects.ts` with:

```ts
import { makeBankQuestion, sentenceFallMs } from './bank';
import { configForLevel } from './difficulty';
import { ENGLISH_BANK } from './english-bank';
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
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(ENGLISH_BANK, level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english'];
```

- [ ] **Step 7: Update the subjects test to the new name**

In `__tests__/game/subjects-test.ts`, replace the first two imports:

```ts
import { configForLevel } from '../../src/game/difficulty';
import { englishFallMs } from '../../src/game/english';
```

with:

```ts
import { sentenceFallMs } from '../../src/game/bank';
import { configForLevel } from '../../src/game/difficulty';
```

and replace:

```ts
      expect(SUBJECTS.english.fallMs(level)).toBe(englishFallMs(level));
```

with:

```ts
      expect(SUBJECTS.english.fallMs(level)).toBe(sentenceFallMs(level));
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 10 suites and 310 tests. That is the same count as before: `bank-test.ts` has 23 tests, like `english-test.ts` did.

- [ ] **Step 9: Typecheck, lint and check for leftovers**

```bash
npx tsc --noEmit
npx expo lint
git grep -nE "englishFallMs|makeEnglishQuestion|EnglishItem|game/english'" -- src __tests__
```

Expected: `tsc` and lint print no errors. `git grep` prints nothing (exit code 1).

- [ ] **Step 10: Commit**

```bash
git add src/game/bank.ts src/game/english-bank.ts src/game/subjects.ts __tests__/game/bank-test.ts __tests__/game/subjects-test.ts
git commit -m "refactor(game): share the sentence engine between subjects as bank.ts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Subjects declare their card kind

A behaviour-preserving refactor. Math keeps its small card and English its sentence card, but the UI now reads the card kind from the registry instead of checking `subject === 'english'`.

**Files:**
- Modify: `src/game/subjects.ts`
- Modify: `src/components/game/layout.ts`
- Modify: `src/components/game/falling-question.tsx:17,43,57,75-76,173-174,192-222`
- Modify: `src/components/game/game-screen.tsx:131-134`
- Test: `__tests__/components/layout-test.ts`, `__tests__/game/subjects-test.ts`

**Interfaces:**
- Consumes: `SUBJECTS`, `Subject` from Task 1
- Produces:
  - `type CardKind = 'short' | 'sentence'` and a `Subject.card: CardKind` field, both in `src/game/subjects.ts`
  - `cardSizeFor(card: CardKind, playAreaWidth: number): CardSize` in `src/components/game/layout.ts`
  - `FallingQuestion` prop `card: CardKind`, replacing `subject: SubjectId`

- [ ] **Step 1: Write the failing tests**

Replace the whole of `__tests__/components/layout-test.ts` with:

```ts
import { cardSizeFor, HERO_HEIGHT } from '../../src/components/game/layout';

describe('cardSizeFor', () => {
  it('keeps the short card at 168 x 64', () => {
    expect(cardSizeFor('short', 390)).toEqual({ width: 168, height: 64 });
  });

  it('makes the sentence card nearly full width, capped at 360, and 104 tall', () => {
    expect(cardSizeFor('sentence', 320)).toEqual({ width: 288, height: 104 });
    expect(cardSizeFor('sentence', 390)).toEqual({ width: 358, height: 104 });
    expect(cardSizeFor('sentence', 800)).toEqual({ width: 360, height: 104 });
  });

  it('never returns a negative width before layout', () => {
    expect(cardSizeFor('sentence', 0).width).toBe(0);
  });

  it('keeps the hero height', () => {
    expect(HERO_HEIGHT).toBe(76);
  });
});
```

In `__tests__/game/subjects-test.ts`, add this test directly after the `'shows the names and badges from the spec'` test:

```ts
  it('gives math the short card and english the sentence card', () => {
    expect(SUBJECTS.math.card).toBe('short');
    expect(SUBJECTS.english.card).toBe('sentence');
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- __tests__/components/layout-test.ts __tests__/game/subjects-test.ts`
Expected: FAIL.
- The sentence-card tests fail with the 168×64 Math card where 288/358/360×104 is expected.
- The card-kind test fails with `undefined` where `'short'` is expected.

- [ ] **Step 3: Add the card kind to the registry**

Replace the whole of `src/game/subjects.ts` with:

```ts
import { makeBankQuestion, sentenceFallMs } from './bank';
import { configForLevel } from './difficulty';
import { ENGLISH_BANK } from './english-bank';
import { makeMathQuestion } from './math';
import type { Question } from './question';
import type { Rng } from './random';

export type SubjectId = 'math' | 'english';

// How a subject's falling card looks: one short line (e.g. "12 × 7") or a wrapped sentence with a blank.
export type CardKind = 'short' | 'sentence';

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  badge: string;
  card: CardKind;
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: 'math',
    name: 'Mathematics',
    shortName: 'MATH',
    badge: '+−×÷',
    card: 'short',
    fallMs: (level) => configForLevel(level).fallMs,
    // Math questions are generated fresh each time, so repeats are fine and usedKeys is ignored.
    makeQuestion: (level, rng, id) => makeMathQuestion(level, rng, id),
  },
  english: {
    id: 'english',
    name: 'English',
    shortName: 'ENGLISH',
    badge: 'Aa',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(ENGLISH_BANK, level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english'];
```

- [ ] **Step 4: Size cards by kind**

Replace the whole of `src/components/game/layout.ts` with:

```ts
import type { CardKind } from '@/game/subjects';

// Height reserved at the bottom of the play area for the hero; its top is the danger line.
export const HERO_HEIGHT = 76;

export interface CardSize {
  width: number;
  height: number;
}

// Short prompts ("12 × 7") fit a small card; sentences need a wide card with room for three lines.
export function cardSizeFor(card: CardKind, playAreaWidth: number): CardSize {
  if (card === 'sentence') {
    return { width: Math.max(0, Math.min(playAreaWidth - 32, 360)), height: 104 };
  }
  return { width: 168, height: 64 };
}
```

- [ ] **Step 5: Give the falling question a `card` prop**

Make these edits in `src/components/game/falling-question.tsx`. They are renames only; do not touch the effects or their order.

(a) Replace the import

```ts
import type { SubjectId } from '@/game/subjects';
```

with:

```ts
import type { CardKind } from '@/game/subjects';
```

(b) In `interface FallingQuestionProps`, replace `  subject: SubjectId;` with:

```ts
  card: CardKind;
```

(c) In the `FallingQuestion({ … })` parameter list, replace `  subject,` with:

```ts
  card,
```

(d) Replace:

```ts
  const card = cardSizeFor(subject, playArea.width);
  const cardHeight = card.height;
```

with:

```ts
  const cardSize = cardSizeFor(card, playArea.width);
  const cardHeight = cardSize.height;
```

(e) Replace:

```tsx
            <View style={[styles.card, { width: card.width, height: cardHeight }]}>
              <CardText question={question} subject={subject} revealing={revealing} />
```

with:

```tsx
            <View style={[styles.card, { width: cardSize.width, height: cardHeight }]}>
              <CardText question={question} card={card} revealing={revealing} />
```

(f) Replace the whole `CardTextProps` interface and `CardText` function (from `interface CardTextProps {` down to the closing `}` of `CardText`) with:

```tsx
interface CardTextProps {
  question: Question;
  card: CardKind;
  revealing: boolean;
}

// The prompt (a sentence shows its blank as a gap), or on a miss the full answer with the answer highlighted.
function CardText({ question, card, revealing }: CardTextProps) {
  const sentence = card === 'sentence';
  const [before, after] = revealing
    ? [question.reveal.before, question.reveal.after]
    : sentence
      ? question.prompt.split(BLANK)
      : [question.prompt, ''];
  return (
    <Text
      style={sentence ? styles.sentenceText : styles.cardText}
      numberOfLines={sentence ? 3 : 1}
      adjustsFontSizeToFit
      minimumFontScale={sentence ? 0.6 : 0.5}
      maxFontSizeMultiplier={1.4}>
      {before}
      {revealing ? (
        <Text style={styles.revealAnswer}>{question.answer}</Text>
      ) : sentence ? (
        <Text style={styles.blank}>{BLANK_GAP}</Text>
      ) : null}
      {after}
    </Text>
  );
}
```

- [ ] **Step 6: Pass the card kind from the game screen**

In `src/components/game/game-screen.tsx`, replace:

```tsx
          <FallingQuestion
            question={question}
            subject={subject}
```

with:

```tsx
          <FallingQuestion
            question={question}
            card={SUBJECTS[subject].card}
```

Only this `subject={subject}` changes. The `Hud` and `Overlay` keep their `subject` props.

- [ ] **Step 7: Run the tests, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
git grep -n "=== 'english'" -- src
```

Expected:
- `npm test`: PASS, 311 tests.
- `tsc` and lint: no errors.
- `git grep`: prints nothing.

- [ ] **Step 8: Commit**

```bash
git add src/game/subjects.ts src/components/game/layout.ts src/components/game/falling-question.tsx src/components/game/game-screen.tsx __tests__/components/layout-test.ts __tests__/game/subjects-test.ts
git commit -m "refactor: let each subject declare its card kind

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Science fact bank

**Review note:** this task's review **is** the spec §2 content review. The reviewer must read every Science item against the person-checked rules:
- Accuracy first.
- Then exactly one true choice, with wrong choices that are clearly false but from the same category.
- Then no changing facts or myths, suitability for all ages, and natural wording.

Flag any doubtful item with a concrete replacement that still passes this task's tests.

**Files:**
- Rename: `__tests__/game/english-bank-test.ts` → `__tests__/game/bank-content-test.ts` (`git mv`), then rewrite
- Create: `src/game/science-bank.ts`
- Modify: `src/game/english-bank.ts` (rules comment only)
- Modify: `__tests__/game/bank-test.ts` (add Science to `BANKS`)

**Interfaces:**
- Consumes: `BankItem` from `src/game/bank.ts` (Task 1)
- Produces: `SCIENCE_BANK: readonly BankItem[]` in `src/game/science-bank.ts`, with 200 items, 40 per band, and ids `sci-<band>-<nnn>`

- [ ] **Step 1: Rename the content test**

```bash
git mv __tests__/game/english-bank-test.ts __tests__/game/bank-content-test.ts
```

- [ ] **Step 2: Write the failing test**

Replace the whole of `__tests__/game/bank-content-test.ts` with:

```ts
import type { BankItem } from '../../src/game/bank';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { SCIENCE_BANK } from '../../src/game/science-bank';

const BANDS = [1, 2, 3, 4, 5] as const;
// The longest sentence (counting the "___") that stays readable on a falling card, and the
// longest choice that fits an answer button.
const MAX_SENTENCE_LENGTH = 60;
const MAX_CHOICE_LENGTH = 16;

const BANKS: [string, string, readonly BankItem[]][] = [
  ['English', 'en', ENGLISH_BANK],
  ['Science', 'sci', SCIENCE_BANK],
];

describe.each(BANKS)('%s bank', (_name, prefix, bank) => {
  it('has at least 35 items in every band', () => {
    for (const band of BANDS) {
      expect(bank.filter((item) => item.band === band).length).toBeGreaterThanOrEqual(35);
    }
  });

  it('uses unique ids that match each item band', () => {
    const ids = bank.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of bank) {
      expect(item.id).toMatch(new RegExp(`^${prefix}-${item.band}-\\d{3}$`));
    }
  });

  it('has no duplicate sentences', () => {
    const sentences = bank.map((item) => item.sentence);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it.each(bank.map((item) => [item.id, item] as const))('%s follows the content rules', (_id, item) => {
    // One blank, written as exactly three underscores.
    expect(item.sentence.split('___')).toHaveLength(2);
    expect(item.sentence).not.toMatch(/____/);
    expect(item.sentence).toBe(item.sentence.trim());
    expect(item.sentence).toMatch(/[.?!]$/);
    expect(item.sentence.length).toBeLessThanOrEqual(MAX_SENTENCE_LENGTH);

    const choices = [item.answer, ...item.wrong];
    expect(item.wrong).toHaveLength(3);
    // Distinct even ignoring case, so "Its" and "its" can never both appear.
    expect(new Set(choices.map((c) => c.toLowerCase())).size).toBe(4);
    for (const choice of choices) {
      expect(choice.length).toBeGreaterThan(0);
      expect(choice.length).toBeLessThanOrEqual(MAX_CHOICE_LENGTH);
      expect(choice).toBe(choice.trim());
      expect(choice.split(/\s+/).length).toBeLessThanOrEqual(3);
      if (item.sentence.startsWith('___')) {
        expect(choice[0]).toBe(choice[0].toUpperCase());
      }
    }
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- __tests__/game/bank-content-test.ts`
Expected: FAIL with `Cannot find module '../../src/game/science-bank'`.

- [ ] **Step 4: Create the bank (transcribe exactly)**

`src/game/science-bank.ts`:

```ts
import type { BankItem } from './bank';

// Rules for every item (checked mechanically in __tests__/game/bank-content-test.ts, except the
// first four, which need a human): exactly ONE choice is true in that exact sentence, and the wrong
// choices are clearly false but from the same category (planets with planets, organs with organs);
// true as written at school level, qualified where needed ("at sea level", "most"); no facts that
// change over time (moon counts, records) and no popular myths; suitable for all ages. Numbers as
// digits, metric units, chemical formulas with subscript digits (H₂O), American spelling. Four
// choices distinct ignoring case, 1-3 words and at most 16 characters, capitalised when the blank
// starts the sentence; sentences at most 60 characters.
// Bands: 1 everyday science, 2 Earth and space, 3 living things and the body, 4 matter, forces and
// energy, 5 tricky science.
export const SCIENCE_BANK: readonly BankItem[] = [
  // Band 1: animal bodies and babies, the senses, plants, the Sun and weather, ice and water
  { id: 'sci-1-001', band: 1, sentence: 'A spider has ___ legs.', answer: '8', wrong: ['6', '4', '10'] },
  { id: 'sci-1-002', band: 1, sentence: 'An adult insect has ___ legs.', answer: '6', wrong: ['8', '4', '10'] },
  { id: 'sci-1-003', band: 1, sentence: 'Birds are covered in ___.', answer: 'feathers', wrong: ['fur', 'wool', 'shells'] },
  { id: 'sci-1-004', band: 1, sentence: 'Fish breathe underwater using their ___.', answer: 'gills', wrong: ['lungs', 'noses', 'fins'] },
  { id: 'sci-1-005', band: 1, sentence: 'Fish use their ___ and tail to swim.', answer: 'fins', wrong: ['wings', 'legs', 'arms'] },
  { id: 'sci-1-006', band: 1, sentence: 'A baby dog is called a ___.', answer: 'puppy', wrong: ['kitten', 'calf', 'foal'] },
  { id: 'sci-1-007', band: 1, sentence: 'A baby cat is called a ___.', answer: 'kitten', wrong: ['puppy', 'chick', 'lamb'] },
  { id: 'sci-1-008', band: 1, sentence: 'A baby sheep is called a ___.', answer: 'lamb', wrong: ['calf', 'foal', 'puppy'] },
  { id: 'sci-1-009', band: 1, sentence: 'A baby horse is called a ___.', answer: 'foal', wrong: ['calf', 'lamb', 'kitten'] },
  { id: 'sci-1-010', band: 1, sentence: 'We see with our ___.', answer: 'eyes', wrong: ['ears', 'nose', 'tongue'] },
  { id: 'sci-1-011', band: 1, sentence: 'We hear sounds with our ___.', answer: 'ears', wrong: ['eyes', 'nose', 'skin'] },
  { id: 'sci-1-012', band: 1, sentence: 'We smell with our ___.', answer: 'nose', wrong: ['ears', 'eyes', 'hands'] },
  { id: 'sci-1-013', band: 1, sentence: 'We taste food with our ___.', answer: 'tongue', wrong: ['ears', 'eyes', 'hair'] },
  { id: 'sci-1-014', band: 1, sentence: 'Plants need ___ to make their own food.', answer: 'sunlight', wrong: ['darkness', 'sand', 'salt'] },
  { id: 'sci-1-015', band: 1, sentence: 'A plant takes in water through its ___.', answer: 'roots', wrong: ['flowers', 'petals', 'fruit'] },
  { id: 'sci-1-016', band: 1, sentence: 'An oak tree grows from an ___.', answer: 'acorn', wrong: ['egg', 'apple', 'onion'] },
  { id: 'sci-1-017', band: 1, sentence: 'Honeybees make ___ from nectar.', answer: 'honey', wrong: ['milk', 'jam', 'silk'] },
  { id: 'sci-1-018', band: 1, sentence: 'Honeybees live together in a ___.', answer: 'hive', wrong: ['den', 'web', 'stable'] },
  { id: 'sci-1-019', band: 1, sentence: 'The Sun rises in the ___.', answer: 'east', wrong: ['west', 'north', 'south'] },
  { id: 'sci-1-020', band: 1, sentence: 'The Sun is a ___.', answer: 'star', wrong: ['planet', 'moon', 'comet'] },
  { id: 'sci-1-021', band: 1, sentence: "Most of Earth's light and heat comes from the ___.", answer: 'Sun', wrong: ['Moon', 'clouds', 'volcanoes'] },
  { id: 'sci-1-022', band: 1, sentence: 'Rain falls from ___.', answer: 'clouds', wrong: ['stars', 'mountains', 'rainbows'] },
  { id: 'sci-1-023', band: 1, sentence: 'Sunlight shining through ___ can make a rainbow.', answer: 'raindrops', wrong: ['bricks', 'wood', 'soil'] },
  { id: 'sci-1-024', band: 1, sentence: 'When water freezes, it turns into ___.', answer: 'ice', wrong: ['steam', 'sand', 'glass'] },
  { id: 'sci-1-025', band: 1, sentence: 'When ice melts, it turns into ___.', answer: 'water', wrong: ['steam', 'snow', 'salt'] },
  { id: 'sci-1-026', band: 1, sentence: 'Snow is made of tiny ___ crystals.', answer: 'ice', wrong: ['salt', 'sugar', 'sand'] },
  { id: 'sci-1-027', band: 1, sentence: 'Wind is moving ___.', answer: 'air', wrong: ['water', 'light', 'sound'] },
  { id: 'sci-1-028', band: 1, sentence: 'The loud sound after lightning is called ___.', answer: 'thunder', wrong: ['hail', 'fog', 'frost'] },
  { id: 'sci-1-029', band: 1, sentence: 'A shadow forms when something blocks ___.', answer: 'light', wrong: ['sound', 'air', 'water'] },
  { id: 'sci-1-030', band: 1, sentence: 'A magnet attracts things made of ___.', answer: 'iron', wrong: ['wood', 'glass', 'paper'] },
  { id: 'sci-1-031', band: 1, sentence: 'Cows mostly eat ___.', answer: 'grass', wrong: ['meat', 'fish', 'insects'] },
  { id: 'sci-1-032', band: 1, sentence: 'Most birds lay their eggs in a ___.', answer: 'nest', wrong: ['hive', 'web', 'den'] },
  { id: 'sci-1-033', band: 1, sentence: 'Many spiders catch insects in a ___.', answer: 'web', wrong: ['hive', 'shell', 'nest'] },
  { id: 'sci-1-034', band: 1, sentence: 'A caterpillar can grow up to become a ___.', answer: 'butterfly', wrong: ['bee', 'spider', 'beetle'] },
  { id: 'sci-1-035', band: 1, sentence: 'A turtle has a hard ___ on its back.', answer: 'shell', wrong: ['wing', 'mane', 'horn'] },
  { id: 'sci-1-036', band: 1, sentence: 'An elephant picks up food with its ___.', answer: 'trunk', wrong: ['tail', 'ears', 'feet'] },
  { id: 'sci-1-037', band: 1, sentence: 'A mother kangaroo carries her baby in a ___.', answer: 'pouch', wrong: ['nest', 'shell', 'hive'] },
  { id: 'sci-1-038', band: 1, sentence: 'Penguins are birds that cannot ___.', answer: 'fly', wrong: ['swim', 'walk', 'eat'] },
  { id: 'sci-1-039', band: 1, sentence: 'Earthworms live in the ___.', answer: 'soil', wrong: ['sky', 'treetops', 'ocean'] },
  { id: 'sci-1-040', band: 1, sentence: 'The leaves of many trees change color in ___.', answer: 'autumn', wrong: ['spring', 'summer', 'winter'] },

  // Band 2: the Sun, Moon and planets, day and year, the water cycle, weather tools, rocks, Earth's layers
  { id: 'sci-2-001', band: 2, sentence: 'The planet closest to the Sun is ___.', answer: 'Mercury', wrong: ['Venus', 'Mars', 'Earth'] },
  { id: 'sci-2-002', band: 2, sentence: '___ is the largest planet in our solar system.', answer: 'Jupiter', wrong: ['Saturn', 'Neptune', 'Earth'] },
  { id: 'sci-2-003', band: 2, sentence: 'Mars is often called the ___ Planet.', answer: 'Red', wrong: ['Blue', 'Green', 'Ringed'] },
  { id: 'sci-2-004', band: 2, sentence: 'The planet famous for its bright rings is ___.', answer: 'Saturn', wrong: ['Mars', 'Venus', 'Mercury'] },
  { id: 'sci-2-005', band: 2, sentence: 'There are ___ planets in our solar system.', answer: '8', wrong: ['7', '9', '10'] },
  { id: 'sci-2-006', band: 2, sentence: 'Earth takes about ___ days to go around the Sun.', answer: '365', wrong: ['30', '100', '500'] },
  { id: 'sci-2-007', band: 2, sentence: 'Earth spins once on its axis about every ___.', answer: '24 hours', wrong: ['1 hour', '7 days', '365 days'] },
  { id: 'sci-2-008', band: 2, sentence: 'We have day and night because Earth ___.', answer: 'spins', wrong: ['orbits the Sun', 'is tilted', 'has a moon'] },
  { id: 'sci-2-009', band: 2, sentence: 'The Moon travels around ___.', answer: 'Earth', wrong: ['Mars', 'Venus', 'Jupiter'] },
  { id: 'sci-2-010', band: 2, sentence: 'The Moon takes about a ___ to orbit Earth.', answer: 'month', wrong: ['day', 'week', 'year'] },
  { id: 'sci-2-011', band: 2, sentence: 'The closest star to Earth is the ___.', answer: 'Sun', wrong: ['Moon', 'North Star', 'Big Dipper'] },
  { id: 'sci-2-012', band: 2, sentence: 'Scientists use a ___ to look at distant stars.', answer: 'telescope', wrong: ['microscope', 'stethoscope', 'periscope'] },
  { id: 'sci-2-013', band: 2, sentence: 'The path a planet takes around the Sun is its ___.', answer: 'orbit', wrong: ['axis', 'atmosphere', 'core'] },
  { id: 'sci-2-014', band: 2, sentence: 'Water turning into vapor is called ___.', answer: 'evaporation', wrong: ['condensation', 'precipitation', 'freezing'] },
  { id: 'sci-2-015', band: 2, sentence: 'Water vapor cooling to form clouds is called ___.', answer: 'condensation', wrong: ['evaporation', 'precipitation', 'melting'] },
  { id: 'sci-2-016', band: 2, sentence: 'Rain, snow, and hail are all types of ___.', answer: 'precipitation', wrong: ['evaporation', 'condensation', 'erosion'] },
  { id: 'sci-2-017', band: 2, sentence: 'A ___ measures temperature.', answer: 'thermometer', wrong: ['barometer', 'ruler', 'compass'] },
  { id: 'sci-2-018', band: 2, sentence: 'A ___ shows which direction is north.', answer: 'compass', wrong: ['thermometer', 'barometer', 'microscope'] },
  { id: 'sci-2-019', band: 2, sentence: 'Melted rock that flows out of a volcano is ___.', answer: 'lava', wrong: ['magma', 'sand', 'ash'] },
  { id: 'sci-2-020', band: 2, sentence: 'Melted rock under the ground is called ___.', answer: 'magma', wrong: ['lava', 'coal', 'clay'] },
  { id: 'sci-2-021', band: 2, sentence: 'Rocks that form from cooled lava or magma are ___ rocks.', answer: 'igneous', wrong: ['sedimentary', 'metamorphic', 'magnetic'] },
  { id: 'sci-2-022', band: 2, sentence: 'The remains of ancient life preserved in rock are ___.', answer: 'fossils', wrong: ['meteors', 'pebbles', 'magma'] },
  { id: 'sci-2-023', band: 2, sentence: 'The force that pulls things toward Earth is ___.', answer: 'gravity', wrong: ['friction', 'magnetism', 'wind'] },
  { id: 'sci-2-024', band: 2, sentence: "Most of Earth's surface is covered by ___.", answer: 'water', wrong: ['sand', 'ice', 'forests'] },
  { id: 'sci-2-025', band: 2, sentence: 'The layer of air around Earth is the ___.', answer: 'atmosphere', wrong: ['crust', 'core', 'mantle'] },
  { id: 'sci-2-026', band: 2, sentence: 'The hard outer layer of Earth is the ___.', answer: 'crust', wrong: ['core', 'mantle', 'atmosphere'] },
  { id: 'sci-2-027', band: 2, sentence: 'The center of Earth is called the ___.', answer: 'core', wrong: ['crust', 'mantle', 'equator'] },
  { id: 'sci-2-028', band: 2, sentence: 'The imaginary line around the middle of Earth is the ___.', answer: 'equator', wrong: ['axis', 'North Pole', 'orbit'] },
  { id: 'sci-2-029', band: 2, sentence: "Earth's crust is broken into huge pieces called ___.", answer: 'plates', wrong: ['poles', 'craters', 'cores'] },
  { id: 'sci-2-030', band: 2, sentence: 'A group of stars that forms a pattern is a ___.', answer: 'constellation', wrong: ['comet', 'planet', 'meteor'] },
  { id: 'sci-2-031', band: 2, sentence: 'Our galaxy is called the ___.', answer: 'Milky Way', wrong: ['Andromeda', 'Big Dipper', 'solar system'] },
  { id: 'sci-2-032', band: 2, sentence: 'The Sun is at the center of our ___.', answer: 'solar system', wrong: ['galaxy', 'planet', 'universe'] },
  { id: 'sci-2-033', band: 2, sentence: 'When the Moon blocks the Sun, it is a solar ___.', answer: 'eclipse', wrong: ['flare', 'wind', 'system'] },
  { id: 'sci-2-034', band: 2, sentence: 'Slow-moving rivers of ice on land are called ___.', answer: 'glaciers', wrong: ['icebergs', 'geysers', 'volcanoes'] },
  { id: 'sci-2-035', band: 2, sentence: 'Hot water that shoots out of the ground is a ___.', answer: 'geyser', wrong: ['glacier', 'canyon', 'delta'] },
  { id: 'sci-2-036', band: 2, sentence: 'The Moon has many ___ made by space rocks crashing into it.', answer: 'craters', wrong: ['volcanoes', 'rivers', 'forests'] },
  { id: 'sci-2-037', band: 2, sentence: 'Shooting stars are space rocks burning up in the ___.', answer: 'atmosphere', wrong: ['ocean', 'clouds', 'Moon'] },
  { id: 'sci-2-038', band: 2, sentence: 'A ___ is a huge storm with strong spinning winds.', answer: 'hurricane', wrong: ['drought', 'fog', 'rainbow'] },
  { id: 'sci-2-039', band: 2, sentence: "The Moon's changing shapes in our sky are called ___.", answer: 'phases', wrong: ['orbits', 'craters', 'seasons'] },
  { id: 'sci-2-040', band: 2, sentence: 'Scientists who study the stars and planets are ___.', answer: 'astronomers', wrong: ['astronauts', 'geologists', 'biologists'] },

  // Band 3: organs and the skeleton, photosynthesis, seeds and pollination, food chains, life cycles, animal groups
  { id: 'sci-3-001', band: 3, sentence: 'The ___ pumps blood around your body.', answer: 'heart', wrong: ['lungs', 'liver', 'stomach'] },
  { id: 'sci-3-002', band: 3, sentence: 'We breathe in air using our ___.', answer: 'lungs', wrong: ['kidneys', 'liver', 'stomach'] },
  { id: 'sci-3-003', band: 3, sentence: 'Your ___ controls your thoughts and movements.', answer: 'brain', wrong: ['heart', 'stomach', 'lungs'] },
  { id: 'sci-3-004', band: 3, sentence: 'Most food is digested in the stomach and the ___.', answer: 'small intestine', wrong: ['lungs', 'heart', 'kidneys'] },
  { id: 'sci-3-005', band: 3, sentence: 'An adult human usually has ___ bones.', answer: '206', wrong: ['106', '306', '26'] },
  { id: 'sci-3-006', band: 3, sentence: 'Your ___ protects your brain.', answer: 'skull', wrong: ['spine', 'kneecap', 'pelvis'] },
  { id: 'sci-3-007', band: 3, sentence: 'Your ___ protect your heart and lungs.', answer: 'ribs', wrong: ['kneecaps', 'hip bones', 'teeth'] },
  { id: 'sci-3-008', band: 3, sentence: 'The human heart has ___ chambers.', answer: '4', wrong: ['2', '3', '6'] },
  { id: 'sci-3-009', band: 3, sentence: 'Your ___ filter waste from your blood.', answer: 'kidneys', wrong: ['bones', 'muscles', 'ears'] },
  { id: 'sci-3-010', band: 3, sentence: 'Muscles are attached to bones by ___.', answer: 'tendons', wrong: ['ligaments', 'nerves', 'veins'] },
  { id: 'sci-3-011', band: 3, sentence: 'Messages travel between your brain and body along ___.', answer: 'nerves', wrong: ['muscles', 'bones', 'tendons'] },
  { id: 'sci-3-012', band: 3, sentence: 'Flat back teeth used for grinding food are ___.', answer: 'molars', wrong: ['incisors', 'canines', 'tusks'] },
  { id: 'sci-3-013', band: 3, sentence: 'Your body gets its energy from ___.', answer: 'food', wrong: ['water', 'sunlight', 'noise'] },
  { id: 'sci-3-014', band: 3, sentence: 'Plants make their food by a process called ___.', answer: 'photosynthesis', wrong: ['digestion', 'respiration', 'evaporation'] },
  { id: 'sci-3-015', band: 3, sentence: 'Plants take in ___ from the air to make food.', answer: 'carbon dioxide', wrong: ['oxygen', 'nitrogen', 'helium'] },
  { id: 'sci-3-016', band: 3, sentence: 'During photosynthesis, plants give off ___.', answer: 'oxygen', wrong: ['carbon dioxide', 'nitrogen', 'smoke'] },
  { id: 'sci-3-017', band: 3, sentence: 'The green substance in leaves that traps sunlight is ___.', answer: 'chlorophyll', wrong: ['chalk', 'nectar', 'pollen'] },
  { id: 'sci-3-018', band: 3, sentence: 'In flowering plants, seeds are made in the ___.', answer: 'flower', wrong: ['root', 'stem', 'leaf'] },
  { id: 'sci-3-019', band: 3, sentence: 'When a seed begins to grow, it is called ___.', answer: 'germination', wrong: ['pollination', 'erosion', 'digestion'] },
  { id: 'sci-3-020', band: 3, sentence: 'Roots take in water and ___ from the soil.', answer: 'nutrients', wrong: ['sunlight', 'pollen', 'nectar'] },
  { id: 'sci-3-021', band: 3, sentence: 'Bees help plants by carrying ___ between flowers.', answer: 'pollen', wrong: ['nectar', 'honey', 'seeds'] },
  { id: 'sci-3-022', band: 3, sentence: 'Moving pollen from flower to flower is called ___.', answer: 'pollination', wrong: ['germination', 'photosynthesis', 'migration'] },
  { id: 'sci-3-023', band: 3, sentence: 'An animal that eats only plants is a ___.', answer: 'herbivore', wrong: ['carnivore', 'omnivore', 'predator'] },
  { id: 'sci-3-024', band: 3, sentence: 'An animal that eats only meat is a ___.', answer: 'carnivore', wrong: ['herbivore', 'omnivore', 'producer'] },
  { id: 'sci-3-025', band: 3, sentence: 'Animals that eat both plants and meat are ___.', answer: 'omnivores', wrong: ['herbivores', 'carnivores', 'producers'] },
  { id: 'sci-3-026', band: 3, sentence: 'In a food chain, plants are called ___.', answer: 'producers', wrong: ['consumers', 'predators', 'decomposers'] },
  { id: 'sci-3-027', band: 3, sentence: 'Living things that break down dead matter are ___.', answer: 'decomposers', wrong: ['producers', 'predators', 'herbivores'] },
  { id: 'sci-3-028', band: 3, sentence: 'An animal that hunts other animals for food is a ___.', answer: 'predator', wrong: ['prey', 'producer', 'herbivore'] },
  { id: 'sci-3-029', band: 3, sentence: 'A caterpillar changing into a butterfly is called ___.', answer: 'metamorphosis', wrong: ['photosynthesis', 'evaporation', 'hibernation'] },
  { id: 'sci-3-030', band: 3, sentence: 'Most frogs hatch from eggs as ___.', answer: 'tadpoles', wrong: ['caterpillars', 'chicks', 'cubs'] },
  { id: 'sci-3-031', band: 3, sentence: 'Animals that sleep through the winter are said to ___.', answer: 'hibernate', wrong: ['migrate', 'evaporate', 'photosynthesize'] },
  { id: 'sci-3-032', band: 3, sentence: 'Birds that fly to warmer places each winter ___.', answer: 'migrate', wrong: ['hibernate', 'molt', 'evolve'] },
  { id: 'sci-3-033', band: 3, sentence: 'Animals with a backbone are called ___.', answer: 'vertebrates', wrong: ['invertebrates', 'insects', 'mollusks'] },
  { id: 'sci-3-034', band: 3, sentence: 'Whales are ___, not fish.', answer: 'mammals', wrong: ['reptiles', 'birds', 'amphibians'] },
  { id: 'sci-3-035', band: 3, sentence: 'Bats are the only ___ that can truly fly.', answer: 'mammals', wrong: ['insects', 'birds', 'reptiles'] },
  { id: 'sci-3-036', band: 3, sentence: 'Frogs and salamanders are ___.', answer: 'amphibians', wrong: ['reptiles', 'mammals', 'insects'] },
  { id: 'sci-3-037', band: 3, sentence: 'Snakes and lizards are ___.', answer: 'reptiles', wrong: ['amphibians', 'mammals', 'insects'] },
  { id: 'sci-3-038', band: 3, sentence: 'Spiders are not insects; they are ___.', answer: 'arachnids', wrong: ['reptiles', 'mammals', 'mollusks'] },
  { id: 'sci-3-039', band: 3, sentence: 'Mammals feed their babies ___.', answer: 'milk', wrong: ['nectar', 'seeds', 'pollen'] },
  { id: 'sci-3-040', band: 3, sentence: 'The natural home of an animal is its ___.', answer: 'habitat', wrong: ['orbit', 'skeleton', 'diet'] },

  // Band 4: states of matter, changes, magnets, electricity, light and sound, forces, energy
  { id: 'sci-4-001', band: 4, sentence: 'Solid, liquid, and gas are states of ___.', answer: 'matter', wrong: ['energy', 'light', 'motion'] },
  { id: 'sci-4-002', band: 4, sentence: 'Pure water freezes at ___ °C.', answer: '0', wrong: ['100', '32', '10'] },
  { id: 'sci-4-003', band: 4, sentence: 'At sea level, water boils at ___ °C.', answer: '100', wrong: ['0', '50', '212'] },
  { id: 'sci-4-004', band: 4, sentence: 'A solid turning into a liquid is called ___.', answer: 'melting', wrong: ['freezing', 'boiling', 'condensing'] },
  { id: 'sci-4-005', band: 4, sentence: 'A liquid turning into a solid is called ___.', answer: 'freezing', wrong: ['melting', 'boiling', 'evaporating'] },
  { id: 'sci-4-006', band: 4, sentence: 'A ___ has a fixed shape and a fixed volume.', answer: 'solid', wrong: ['liquid', 'gas', 'plasma'] },
  { id: 'sci-4-007', band: 4, sentence: 'A liquid takes the shape of its ___.', answer: 'container', wrong: ['color', 'weight', 'temperature'] },
  { id: 'sci-4-008', band: 4, sentence: 'Water vapor is water in the form of a ___.', answer: 'gas', wrong: ['solid', 'liquid', 'metal'] },
  { id: 'sci-4-009', band: 4, sentence: 'Iron rusting is an example of a ___ change.', answer: 'chemical', wrong: ['physical', 'magnetic', 'nuclear'] },
  { id: 'sci-4-010', band: 4, sentence: 'Melting ice is an example of a ___ change.', answer: 'physical', wrong: ['chemical', 'magnetic', 'nuclear'] },
  { id: 'sci-4-011', band: 4, sentence: 'Mixing salt into water makes a ___.', answer: 'solution', wrong: ['magnet', 'metal', 'gas'] },
  { id: 'sci-4-012', band: 4, sentence: 'Like magnetic poles ___ each other.', answer: 'repel', wrong: ['attract', 'melt', 'freeze'] },
  { id: 'sci-4-013', band: 4, sentence: 'Opposite magnetic poles ___ each other.', answer: 'attract', wrong: ['repel', 'melt', 'freeze'] },
  { id: 'sci-4-014', band: 4, sentence: 'A magnet has a north pole and a ___ pole.', answer: 'south', wrong: ['east', 'west', 'top'] },
  { id: 'sci-4-015', band: 4, sentence: 'Materials that let electricity flow easily are ___.', answer: 'conductors', wrong: ['insulators', 'mirrors', 'fuels'] },
  { id: 'sci-4-016', band: 4, sentence: 'Rubber and plastic are good electrical ___.', answer: 'insulators', wrong: ['conductors', 'magnets', 'batteries'] },
  { id: 'sci-4-017', band: 4, sentence: '___ is a metal often used in electrical wires.', answer: 'Copper', wrong: ['Rubber', 'Glass', 'Wood'] },
  { id: 'sci-4-018', band: 4, sentence: 'A ___ turns a circuit on and off.', answer: 'switch', wrong: ['bulb', 'wire', 'battery'] },
  { id: 'sci-4-019', band: 4, sentence: 'Electricity flows around a complete ___.', answer: 'circuit', wrong: ['magnet', 'prism', 'lever'] },
  { id: 'sci-4-020', band: 4, sentence: 'Light travels in ___ lines.', answer: 'straight', wrong: ['curved', 'zigzag', 'wavy'] },
  { id: 'sci-4-021', band: 4, sentence: 'Bouncing light off a mirror is called ___.', answer: 'reflection', wrong: ['refraction', 'absorption', 'evaporation'] },
  { id: 'sci-4-022', band: 4, sentence: 'Light bending as it enters water is called ___.', answer: 'refraction', wrong: ['reflection', 'absorption', 'vibration'] },
  { id: 'sci-4-023', band: 4, sentence: 'A prism splits white light into a ___ of colors.', answer: 'spectrum', wrong: ['shadow', 'mirror', 'lens'] },
  { id: 'sci-4-024', band: 4, sentence: 'Sound is made when objects ___.', answer: 'vibrate', wrong: ['melt', 'freeze', 'glow'] },
  { id: 'sci-4-025', band: 4, sentence: 'Sound cannot travel through ___.', answer: 'empty space', wrong: ['water', 'air', 'steel'] },
  { id: 'sci-4-026', band: 4, sentence: 'An echo is a sound that ___ off a surface.', answer: 'bounces', wrong: ['melts', 'freezes', 'glows'] },
  { id: 'sci-4-027', band: 4, sentence: 'We see lightning before thunder because light is ___.', answer: 'faster', wrong: ['slower', 'brighter', 'hotter'] },
  { id: 'sci-4-028', band: 4, sentence: 'The force that slows down things rubbing together is ___.', answer: 'friction', wrong: ['gravity', 'magnetism', 'electricity'] },
  { id: 'sci-4-029', band: 4, sentence: 'Air resistance is a force that ___ falling objects.', answer: 'slows down', wrong: ['speeds up', 'pulls down', 'magnetizes'] },
  { id: 'sci-4-030', band: 4, sentence: 'A push or a pull is called a ___.', answer: 'force', wrong: ['mass', 'volume', 'speed'] },
  { id: 'sci-4-031', band: 4, sentence: 'Energy from the Sun is called ___ energy.', answer: 'solar', wrong: ['tidal', 'geothermal', 'electrical'] },
  { id: 'sci-4-032', band: 4, sentence: 'Wind, solar, and water power are ___ energy sources.', answer: 'renewable', wrong: ['nonrenewable', 'fossil', 'chemical'] },
  { id: 'sci-4-033', band: 4, sentence: 'Coal, oil, and natural gas are ___ fuels.', answer: 'fossil', wrong: ['renewable', 'solar', 'nuclear'] },
  { id: 'sci-4-034', band: 4, sentence: 'The energy of a moving object is called ___ energy.', answer: 'kinetic', wrong: ['potential', 'solar', 'chemical'] },
  { id: 'sci-4-035', band: 4, sentence: 'A battery stores ___ energy.', answer: 'chemical', wrong: ['kinetic', 'solar', 'sound'] },
  { id: 'sci-4-036', band: 4, sentence: 'A lever, a pulley, and a ramp are simple ___.', answer: 'machines', wrong: ['circuits', 'magnets', 'forces'] },
  { id: 'sci-4-037', band: 4, sentence: 'Heat moves from ___ objects to colder ones.', answer: 'warmer', wrong: ['smaller', 'darker', 'heavier'] },
  { id: 'sci-4-038', band: 4, sentence: 'A material that lets light pass through clearly is ___.', answer: 'transparent', wrong: ['opaque', 'magnetic', 'flexible'] },
  { id: 'sci-4-039', band: 4, sentence: 'Objects that block all light are ___.', answer: 'opaque', wrong: ['transparent', 'translucent', 'liquid'] },
  { id: 'sci-4-040', band: 4, sentence: 'Objects float in water when they are ___ than water.', answer: 'less dense', wrong: ['denser', 'hotter', 'larger'] },

  // Band 5: elements and atoms, acids, cells and DNA, units, surprising facts
  { id: 'sci-5-001', band: 5, sentence: 'The chemical symbol for gold is ___.', answer: 'Au', wrong: ['Ag', 'Fe', 'Pb'] },
  { id: 'sci-5-002', band: 5, sentence: 'The chemical symbol for iron is ___.', answer: 'Fe', wrong: ['Ir', 'In', 'I'] },
  { id: 'sci-5-003', band: 5, sentence: 'The chemical symbol for sodium is ___.', answer: 'Na', wrong: ['S', 'Sn', 'K'] },
  { id: 'sci-5-004', band: 5, sentence: 'H₂O is the chemical formula for ___.', answer: 'water', wrong: ['salt', 'oxygen', 'hydrogen'] },
  { id: 'sci-5-005', band: 5, sentence: 'CO₂ is the chemical formula for ___.', answer: 'carbon dioxide', wrong: ['oxygen', 'water', 'carbon monoxide'] },
  { id: 'sci-5-006', band: 5, sentence: 'Table salt is the compound sodium ___.', answer: 'chloride', wrong: ['carbonate', 'oxide', 'hydroxide'] },
  { id: 'sci-5-007', band: 5, sentence: "The most common gas in Earth's air is ___.", answer: 'nitrogen', wrong: ['oxygen', 'carbon dioxide', 'hydrogen'] },
  { id: 'sci-5-008', band: 5, sentence: 'Substances made of a single kind of atom are ___.', answer: 'elements', wrong: ['compounds', 'mixtures', 'solutions'] },
  { id: 'sci-5-009', band: 5, sentence: 'The center of an atom is called the ___.', answer: 'nucleus', wrong: ['electron', 'molecule', 'cell'] },
  { id: 'sci-5-010', band: 5, sentence: 'The nucleus of a carbon atom has protons and ___.', answer: 'neutrons', wrong: ['electrons', 'photons', 'molecules'] },
  { id: 'sci-5-011', band: 5, sentence: 'Tiny negatively charged particles in atoms are ___.', answer: 'electrons', wrong: ['protons', 'neutrons', 'nuclei'] },
  { id: 'sci-5-012', band: 5, sentence: 'Substances with a pH below 7 are ___.', answer: 'acids', wrong: ['bases', 'metals', 'gases'] },
  { id: 'sci-5-013', band: 5, sentence: 'At room temperature, pure water has a pH of ___.', answer: '7', wrong: ['1', '14', '10'] },
  { id: 'sci-5-014', band: 5, sentence: 'In plant and animal cells, the ___ controls the cell.', answer: 'nucleus', wrong: ['cell wall', 'ribosome', 'vacuole'] },
  { id: 'sci-5-015', band: 5, sentence: 'Our cells release most energy from food in their ___.', answer: 'mitochondria', wrong: ['nuclei', 'cell walls', 'vacuoles'] },
  { id: 'sci-5-016', band: 5, sentence: 'Plant cells have a ___ that animal cells do not.', answer: 'cell wall', wrong: ['nucleus', 'membrane', 'mitochondrion'] },
  { id: 'sci-5-017', band: 5, sentence: 'Plants carry out photosynthesis in their ___.', answer: 'chloroplasts', wrong: ['mitochondria', 'nuclei', 'roots'] },
  { id: 'sci-5-018', band: 5, sentence: 'The genetic instructions in our cells are stored in ___.', answer: 'DNA', wrong: ['ATP', 'sugar', 'fat'] },
  { id: 'sci-5-019', band: 5, sentence: 'Genes are found on ___ in the nucleus.', answer: 'chromosomes', wrong: ['ribosomes', 'vacuoles', 'membranes'] },
  { id: 'sci-5-020', band: 5, sentence: 'Red blood cells carry ___ around the body.', answer: 'oxygen', wrong: ['nitrogen', 'food', 'germs'] },
  { id: 'sci-5-021', band: 5, sentence: 'White blood cells help the body fight ___.', answer: 'infections', wrong: ['gravity', 'thirst', 'sunlight'] },
  { id: 'sci-5-022', band: 5, sentence: 'The largest organ of the human body is the ___.', answer: 'skin', wrong: ['liver', 'heart', 'brain'] },
  { id: 'sci-5-023', band: 5, sentence: 'Plants losing water through their leaves is called ___.', answer: 'transpiration', wrong: ['respiration', 'pollination', 'germination'] },
  { id: 'sci-5-024', band: 5, sentence: 'The SI unit of force is the ___.', answer: 'newton', wrong: ['joule', 'watt', 'meter'] },
  { id: 'sci-5-025', band: 5, sentence: 'The SI unit of energy is the ___.', answer: 'joule', wrong: ['newton', 'watt', 'volt'] },
  { id: 'sci-5-026', band: 5, sentence: 'The SI unit of power is the ___.', answer: 'watt', wrong: ['joule', 'newton', 'volt'] },
  { id: 'sci-5-027', band: 5, sentence: 'The planet with the hottest surface is ___.', answer: 'Venus', wrong: ['Mercury', 'Mars', 'Earth'] },
  { id: 'sci-5-028', band: 5, sentence: 'Light from the Sun takes about 8 ___ to reach Earth.', answer: 'minutes', wrong: ['seconds', 'hours', 'days'] },
  { id: 'sci-5-029', band: 5, sentence: 'A light-year is a unit of ___.', answer: 'distance', wrong: ['time', 'speed', 'brightness'] },
  { id: 'sci-5-030', band: 5, sentence: 'Earth has seasons mainly because of its ___.', answer: 'tilted axis', wrong: ['varying distance', 'spinning', 'Moon'] },
  { id: 'sci-5-031', band: 5, sentence: 'Tides in the ocean are caused mainly by the ___.', answer: 'Moon', wrong: ['wind', 'Sun', 'rivers'] },
  { id: 'sci-5-032', band: 5, sentence: 'Sound usually travels fastest through ___.', answer: 'solids', wrong: ['liquids', 'gases', 'empty space'] },
  { id: 'sci-5-033', band: 5, sentence: 'On the Moon, your ___ would be the same as on Earth.', answer: 'mass', wrong: ['weight', 'jump height', 'fall speed'] },
  { id: 'sci-5-034', band: 5, sentence: "A camel's hump stores ___.", answer: 'fat', wrong: ['water', 'milk', 'air'] },
  { id: 'sci-5-035', band: 5, sentence: 'Many bats find food in the dark using ___.', answer: 'echolocation', wrong: ['photosynthesis', 'magnetism', 'hibernation'] },
  { id: 'sci-5-036', band: 5, sentence: 'Diamonds and graphite are both made of ___.', answer: 'carbon', wrong: ['silicon', 'iron', 'quartz'] },
  { id: 'sci-5-037', band: 5, sentence: 'The Sun is mostly made of ___.', answer: 'hydrogen', wrong: ['oxygen', 'iron', 'carbon'] },
  { id: 'sci-5-038', band: 5, sentence: 'Water expands when it freezes, so ice ___ on water.', answer: 'floats', wrong: ['sinks', 'shrinks', 'dissolves'] },
  { id: 'sci-5-039', band: 5, sentence: 'An octopus has ___ hearts.', answer: '3', wrong: ['1', '2', '8'] },
  { id: 'sci-5-040', band: 5, sentence: 'The speed of light is about 300,000 ___ per second.', answer: 'km', wrong: ['meters', 'miles', 'feet'] },
];
```

- [ ] **Step 5: Point the English rules comment at the renamed test**

In `src/game/english-bank.ts`, replace the rules comment:

```ts
// Rules for every item (checked mechanically in __tests__/game/english-bank-test.ts, except the
// first, which needs a human): exactly ONE choice is grammatical and natural in that exact sentence;
// context words (yesterday, every day, right now, since 2019...) rule out the others. Four choices
// distinct ignoring case, 1-3 words, capitalised when the blank starts the sentence. American English.
// Bands: 1 basics, 2 everyday tenses, 3 building sentences, 4 getting tricky, 5 tricky usage.
```

with:

```ts
// Rules for every item (checked mechanically in __tests__/game/bank-content-test.ts, except the
// first, which needs a human): exactly ONE choice is grammatical and natural in that exact sentence;
// context words (yesterday, every day, right now, since 2019...) rule out the others. Four choices
// distinct ignoring case, 1-3 words and at most 16 characters, capitalised when the blank starts the
// sentence; sentences at most 60 characters. American English.
// Bands: 1 basics, 2 everyday tenses, 3 building sentences, 4 getting tricky, 5 tricky usage.
```

- [ ] **Step 6: Run the Science bank through the engine tests too**

In `__tests__/game/bank-test.ts`, add this import directly after the `random` import, so the paths stay alphabetical (`bank`, `english-bank`, `random`, `science-bank`):

```ts
import { SCIENCE_BANK } from '../../src/game/science-bank';
```

Then replace:

```ts
const BANKS: [string, readonly BankItem[]][] = [['English', ENGLISH_BANK]];
```

with:

```ts
const BANKS: [string, readonly BankItem[]][] = [
  ['English', ENGLISH_BANK],
  ['Science', SCIENCE_BANK],
];
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- __tests__/game/bank-content-test.ts __tests__/game/bank-test.ts`
Expected: PASS.
- `bank-content-test.ts`: 406 tests (for each bank, 3 bank-wide checks plus 200 per-item checks).
- `bank-test.ts`: 25 tests.

If a per-item check fails for Science, you made a transcription error. Fix the item to match this plan exactly; do not change the test. (If the task review replaces an item, the replacement must pass these same checks.)

- [ ] **Step 8: Run everything, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
```

Expected:
- `npm test`: PASS, 516 tests.
- `tsc` and lint: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/game/science-bank.ts src/game/english-bank.ts __tests__/game/bank-content-test.ts __tests__/game/bank-test.ts
git commit -m "feat(game): add the Science fact bank

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Science joins the game

**Files:**
- Modify: `src/game/subjects.ts`
- Modify: `src/hooks/best-score-keys.ts`
- Modify: `src/hooks/use-best-scores.ts:12`
- Modify: `src/components/game/overlay.tsx:69-72`
- Modify: `README.md`
- Test: `__tests__/game/subjects-test.ts`, `__tests__/hooks/best-score-keys-test.ts`, `__tests__/game/reducer-test.ts`

**Interfaces:**
- Consumes:
  - `makeBankQuestion`, `sentenceFallMs` (Task 1)
  - `CardKind`, `Subject.card` (Task 2)
  - `SCIENCE_BANK` (Task 3)
- Produces:
  - `SubjectId = 'math' | 'english' | 'science'`
  - `SUBJECTS.science`
  - `SUBJECT_IDS = ['math', 'english', 'science']`
  - `BEST_SCORE_KEYS.science`

- [ ] **Step 1: Write the failing tests**

Replace the whole of `__tests__/game/subjects-test.ts` with:

```ts
import { sentenceFallMs } from '../../src/game/bank';
import { configForLevel } from '../../src/game/difficulty';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';
import { SCIENCE_BANK } from '../../src/game/science-bank';
import { SUBJECT_IDS, SUBJECTS } from '../../src/game/subjects';

describe('SUBJECTS', () => {
  it('lists math, english then science, each keyed by its own id', () => {
    expect(SUBJECT_IDS).toEqual(['math', 'english', 'science']);
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id].id).toBe(id);
    }
  });

  it('shows the names and badges from the spec', () => {
    expect(SUBJECTS.math).toMatchObject({ name: 'Mathematics', shortName: 'MATH', badge: '+−×÷' });
    expect(SUBJECTS.english).toMatchObject({ name: 'English', shortName: 'ENGLISH', badge: 'Aa' });
    expect(SUBJECTS.science).toMatchObject({ name: 'Science', shortName: 'SCIENCE', badge: 'H₂O' });
  });

  it('gives math the short card and the sentence subjects the sentence card', () => {
    expect(SUBJECTS.math.card).toBe('short');
    expect(SUBJECTS.english.card).toBe('sentence');
    expect(SUBJECTS.science.card).toBe('sentence');
  });

  it('uses each subject own fall times', () => {
    for (const level of [1, 4, 7, 12]) {
      expect(SUBJECTS.math.fallMs(level)).toBe(configForLevel(level).fallMs);
      expect(SUBJECTS.english.fallMs(level)).toBe(sentenceFallMs(level));
      expect(SUBJECTS.science.fallMs(level)).toBe(sentenceFallMs(level));
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

  it('science makes questions from its own bank and honours used keys', () => {
    const band1 = SCIENCE_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.science.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });
});
```

In `__tests__/hooks/best-score-keys-test.ts`, add this test after the English one:

```ts
  it('gives Science its own key', () => {
    expect(BEST_SCORE_KEYS.science).toBe('quiz-shooter:best-score:science');
  });
```

In `__tests__/game/reducer-test.ts`, add this import directly after the multi-line `reducer` import and before `import type { SubjectId }`, so the paths stay alphabetical (`english-bank`, `random`, `reducer`, `science-bank`, `subjects`):

```ts
import { SCIENCE_BANK } from '../../src/game/science-bank';
```

Then add this test directly after `'START begins play with a first question in the chosen subject'`:

```ts
  it('START with science draws the first question from the Science bank', () => {
    const { state } = start(1, 'science');
    expect(state.subject).toBe('science');
    const source = SCIENCE_BANK.find((i) => i.id === state.question!.key);
    expect(source?.band).toBe(1);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- __tests__/game/subjects-test.ts __tests__/hooks/best-score-keys-test.ts __tests__/game/reducer-test.ts`
Expected: FAIL.
- `SUBJECT_IDS` lacks `'science'`.
- `SUBJECTS.science` is undefined.
- `BEST_SCORE_KEYS.science` is undefined.
- The reducer test throws `TypeError: Cannot read properties of undefined (reading 'makeQuestion')`.

- [ ] **Step 3: Register Science**

Replace the whole of `src/game/subjects.ts` with:

```ts
import { makeBankQuestion, sentenceFallMs } from './bank';
import { configForLevel } from './difficulty';
import { ENGLISH_BANK } from './english-bank';
import { makeMathQuestion } from './math';
import type { Question } from './question';
import type { Rng } from './random';
import { SCIENCE_BANK } from './science-bank';

export type SubjectId = 'math' | 'english' | 'science';

// How a subject's falling card looks: one short line (e.g. "12 × 7") or a wrapped sentence with a blank.
export type CardKind = 'short' | 'sentence';

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  badge: string;
  card: CardKind;
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: 'math',
    name: 'Mathematics',
    shortName: 'MATH',
    badge: '+−×÷',
    card: 'short',
    fallMs: (level) => configForLevel(level).fallMs,
    // Math questions are generated fresh each time, so repeats are fine and usedKeys is ignored.
    makeQuestion: (level, rng, id) => makeMathQuestion(level, rng, id),
  },
  english: {
    id: 'english',
    name: 'English',
    shortName: 'ENGLISH',
    badge: 'Aa',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(ENGLISH_BANK, level, rng, id, usedKeys),
  },
  science: {
    id: 'science',
    name: 'Science',
    shortName: 'SCIENCE',
    badge: 'H₂O',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(SCIENCE_BANK, level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english', 'science'];
```

- [ ] **Step 4: Give Science its own best score**

Replace the whole of `src/hooks/best-score-keys.ts` with:

```ts
import type { SubjectId } from '@/game/subjects';

// Math keeps the original key so bests saved before English existed carry over.
export const BEST_SCORE_KEYS: Record<SubjectId, string> = {
  math: 'quiz-shooter:best-score',
  english: 'quiz-shooter:best-score:english',
  science: 'quiz-shooter:best-score:science',
};
```

In `src/hooks/use-best-scores.ts`, replace:

```ts
  const [best, setBest] = useState<BestScores>({ math: 0, english: 0 });
```

with:

```ts
  const [best, setBest] = useState<BestScores>({ math: 0, english: 0, science: 0 });
```

- [ ] **Step 5: Keep three subject buttons inside the picker at large text sizes**

In `src/components/game/overlay.tsx`, inside `SubjectButton`, replace:

```tsx
      <View style={styles.subjectText}>
        <Text style={styles.subjectName}>{name}</Text>
        <Text style={styles.subjectBest}>Best {best}</Text>
      </View>
```

with:

```tsx
      <View style={styles.subjectText}>
        <Text style={styles.subjectName} maxFontSizeMultiplier={1.4}>
          {name}
        </Text>
        <Text style={styles.subjectBest} maxFontSizeMultiplier={1.4}>
          Best {best}
        </Text>
      </View>
```

- [ ] **Step 6: Describe all three subjects in the README**

In `README.md`, replace the opening paragraph:

```markdown
A casual brain-training game for all ages. Simple math questions such as `7 × 6` fall from the top of
the screen toward your hero; tap the right answer out of four choices and the hero shoots the question
apart before it lands. You have three lives: a wrong tap and a question reaching the hero each cost
one. Questions get harder and faster as your score climbs, and your best score is saved on the device.
Built with Expo, React Native and Reanimated, for portrait phones (web works as a bonus).
```

with:

```markdown
A casual brain-training game for all ages. Pick a subject, and its questions fall from the top of the
screen toward your hero:

- **Mathematics:** sums such as `7 × 6`.
- **English:** grammar sentences with a blank, such as `She ___ to school every day.`
- **Science:** facts with a blank, such as `The planet closest to the Sun is ___.`

Tap the right answer out of four choices and the hero shoots the question apart before it lands. You
have three lives: a wrong tap and a question reaching the hero each cost one, and a missed question
shows its answer. Questions get harder and faster as your score climbs, and each subject's best score
is saved on the device. Built with Expo, React Native and Reanimated, for portrait phones (web works
as a bonus).
```

Then, under "Where the code lives", replace:

```markdown
- `src/game/` - pure TypeScript game logic (questions, difficulty, scoring, state reducer) with no
  React or React Native imports. Its unit tests are in `__tests__/game/`.
```

with:

```markdown
- `src/game/` - pure TypeScript game logic (subjects, question banks, difficulty, scoring, state
  reducer) with no React or React Native imports. Its unit tests are in `__tests__/game/`.
```

and replace:

```markdown
- `src/hooks/` - best-score persistence.
```

with:

```markdown
- `src/hooks/` - per-subject best-score persistence.
```

- [ ] **Step 7: Run the tests, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
```

Expected:
- `npm test`: PASS, 519 tests.
- `tsc` and lint: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/game/subjects.ts src/hooks/best-score-keys.ts src/hooks/use-best-scores.ts src/components/game/overlay.tsx README.md __tests__/game/subjects-test.ts __tests__/hooks/best-score-keys-test.ts __tests__/game/reducer-test.ts
git commit -m "feat: add Science as a third subject

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** none expected. Fix anything the checks report inside the file that owns it.

- [ ] **Step 1: Run the full check suite**

```bash
npx expo-doctor
npx expo lint
npx tsc --noEmit
npm test
git grep -nE "englishFallMs|makeEnglishQuestion|EnglishItem|=== 'english'" -- src __tests__
```

Expected:
- Every check command exits 0, and `npm test` reports 519 tests.
- The final `git grep` prints nothing.
- `expo-doctor` needs network access. If it fails only because it can't reach the network, report that; don't change files to satisfy it.

- [ ] **Step 2: Device check (human)**

Ask the user to run `npx expo start`, open Expo Go on a phone, and check:
- **Picker:**
  - It shows Mathematics, English and Science, each with its own best.
  - The Math and English bests from before the update are still there.
  - All three buttons fit on a small phone, including at a large OS text size.
- **Science:**
  - The sentence appears on the wide card with the blank as a gap.
  - A correct tap shoots it apart.
  - A landed card reveals the complete fact with the answer in green, and the right button turns green.
  - A third wrong tap reveals the answer, then shows Game Over.
- **Long Science items** fit on the card and buttons on a small phone. Check for example `The Moon has many ___ made by space rocks crashing into it.`, and choices such as `varying distance` and `photosynthesis`.
- **Math and English** play exactly as before.
- **Menus:**
  - Pause → Menu returns to the picker and keeps a new Science best.
  - Game Over → Play again (same subject) and Change subject both work.

- [ ] **Step 3: Commit any fixes**

Stage explicit paths only. Skip this commit if nothing changed.

```bash
git add <the files you changed>
git commit -m "chore: fix issues found in final verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
