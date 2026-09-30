# Science Mode — Design Spec

Date: 2026-09-30
Status: Approved in conversation (pending written-spec review)
Builds on: `docs/superpowers/specs/2026-09-29-english-mode-design.md` and `docs/superpowers/specs/2026-09-29-quiz-shooter-design.md`. Everything in them still applies unless this document changes it.

## Purpose

Add a third subject, **Science**, to Quiz Shooter. Science questions are fill-in-the-blank facts with four choices, the same shape as English. The player shoots the sentence down by picking the word or phrase that makes the fact true. The audience is all ages: Science starts with everyday science and ramps into tricky facts. On a miss, the reveal shows the complete, true fact.

Two supporting changes make Science (and any later sentence subject) a data file plus a registry entry:
- English's sentence engine becomes a shared module with neutral names.
- Each subject declares its card type. The UI no longer checks `subject === 'english'`, a check that would have silently given Science the small one-line Math card.

## Decisions

| Topic | Decision |
|---|---|
| Audience | All ages, easy → tricky: everyday science → Earth and space → living things → matter and forces → tricky science |
| Format | Fill-in-the-blank facts with 4 choices, as in English. The reveal reads as the complete fact. |
| Architecture | `english.ts` becomes the shared `bank.ts`. English and Science are each a data file plus a registry entry. |
| Card look | Each subject declares `card: 'short' \| 'sentence'`. The UI reads it instead of checking subject ids. |
| Content | ~200 hand-written facts in a bundled data file. Works offline; no AI or network. |
| Fall speed | Same as English (`sentenceFallMs`). Tune after playtesting if needed. |
| Best score | Separate per subject, new key `quiz-shooter:best-score:science` |
| Packages | No new packages |

## 1. Player experience

- **Subject picker:** a third button, "Science", with badge `H₂O` and "Best N". The order is Mathematics, English, Science.
  - The subject button's name and "Best N" text get `maxFontSizeMultiplier={1.4}`, as its badge already has. This keeps three buttons inside the non-scrolling panel on a small phone at large OS text sizes.
- **HUD:** the centre shows `SCIENCE` above `LV n`. It is the same width as `ENGLISH`, so it fits a 320 px-wide screen.
- **Card:** the English sentence card:
  - width `min(playAreaWidth − 32, 360)` and height 104
  - up to 3 lines of 22 px text that shrinks to fit (minimum scale 0.6, max font scale 1.4)
  - the `___` drawn as a visible gap
- **Reveal:** works as it does today: 1500 ms, answer in green on the card, correct answer button highlighted green.
- **Fall time:** `sentenceFallMs(level)`, which is today's `englishFallMs` under a new name: 12000 / 11000 / 10000 / 9000 ms at levels 1–4, then `9000 − 500·(level − 4)`, never below 6000 ms.
- **Unchanged:** scoring (+3 / +2 / +1 by fall progress), 3 lives, level thresholds, pause and Menu, game over, Play again, Change subject, and the per-subject "New best!" rule.

## 2. Science content

### Levels and topic bands

The level comes from the score through the existing `levelForScore` thresholds: 0 / 5 / 10 / 20 / 30, then every +10. The band comes from the shared `bandsForLevel`: band = level for levels 1–5, and bands 4 and 5 pooled from level 6. Band 1 is therefore a short warm-up (score 0–4), and most of a long run draws from bands 4–5, as in English.

| Band | Used at level | Topics | Example (correct first) |
|---|---|---|---|
| 1 | 1 | Everyday science: animal bodies and coverings, baby animals, the senses, what plants need, day and night, weather, ice and water | `A spider has ___ legs.` → 8 / 6 / 4 / 10 |
| 2 | 2 | Earth and space: Sun, Moon and planets, day and year, seasons, the water cycle, weather tools, volcanoes and rocks, gravity | `The planet closest to the Sun is ___.` → Mercury / Venus / Mars / Earth |
| 3 | 3 | Living things and the body: organs and the skeleton, food chains, photosynthesis, life cycles, animal groups | `An animal that eats only plants is a ___.` → herbivore / carnivore / omnivore / predator |
| 4 | 4 | Matter, forces and energy: states of matter, magnets, conductors and insulators, light and sound, friction, energy sources | `Sound cannot travel through ___.` → empty space / water / air / steel |
| 5 | 5 | Tricky science: elements and symbols, atoms, acids and bases, cells and DNA, units (newton, joule, watt), surprising facts (Venus is the hottest planet) | `The chemical symbol for gold is ___.` → Au / Ag / Fe / Pb |
| 4 + 5 | 6 and up | Bands 4 and 5 pooled together | — |

### Item format (`src/game/science-bank.ts`)

Science uses the shared `BankItem` type from `src/game/bank.ts`:

```ts
interface BankItem {
  id: string;                       // "sci-<band>-<nnn>" for Science, e.g. "sci-2-014"; unique
  band: 1 | 2 | 3 | 4 | 5;
  sentence: string;                 // contains exactly one "___" (three underscores): the blank
  answer: string;                   // the one correct fill
  wrong: [string, string, string];  // three wrong fills
}
```

### Content rules (every Science item)

**Checked by a person (content review):**
- **Exactly one choice is true in that exact sentence.** The three wrong choices must be clearly false there, but plausible: the same category as the answer (planets with planets, organs with organs, gases with gases).
- **True as written at school level**, with no "well, actually" exceptions. Add a qualifier when one is needed: "at sea level", "an adult human", "most".
- **Timeless:** no facts that change over time, such as the number of moons a planet has, record holders, or "largest known" discoveries.
- **No popular myths:** e.g. the tongue taste map, "we only use 10% of our brain", blue blood in veins, "lightning never strikes the same place twice".
- **Style:**
  - Numbers are written as digits.
  - Units are metric (°C, km, kg).
  - Chemical formulas use Unicode subscript digits (H₂O, CO₂).
  - American spelling.
- **Audience:** suitable for all ages.
- **Wording:** sentences are complete and natural.

**Checked mechanically (tests, applied to the English bank too, which already passes):**
- Exactly one `___` in the sentence, and no run of four or more underscores.
- The sentence is trimmed and ends with `.`, `?` or `!`.
- **The sentence is at most 60 characters** (JavaScript string length, counting the `___`). This keeps it readable while it falls. English's longest is 50.
- Exactly 3 wrong choices. All four choices are distinct, including when compared case-insensitively.
- Each choice is non-empty, trimmed, 1–3 words, and **at most 16 characters**, so it fits an answer button. English's longest is 16.
- If the blank starts the sentence, every choice is capitalised: its first character is not lower case.
- Ids are unique, match `^sci-<band>-\d{3}$`, and agree with the item's `band`.
- No duplicate sentences.
- At least **35 items per band**, target ~40 (≈200 total).

### Content review

A separate review pass reads every Science fact against the person-checked rules. Accuracy comes first, then the one-right-answer rule, then myths and changing facts, age suitability and natural wording. Any item that fails is fixed or replaced. The user may also skim the data file.

## 3. Architecture

```
src/game/
  bank.ts              RENAMED  from english.ts (git mv): shared sentence engine, neutral names
  english-bank.ts      CHANGED  ENGLISH_BANK typed as BankItem[]; EnglishItem removed; rules comment updated
  science-bank.ts      NEW      SCIENCE_BANK (~200 items)
  subjects.ts          CHANGED  'science' id, CardKind, card field, registry entry, SUBJECT_IDS order
src/hooks/
  best-score-keys.ts   CHANGED  science key
  use-best-scores.ts   CHANGED  science: 0 in the initial state
src/components/game/
  layout.ts            CHANGED  cardSizeFor takes a CardKind
  falling-question.tsx CHANGED  `card` prop replaces `subject`
  game-screen.tsx      CHANGED  passes the subject's card kind
  overlay.tsx          CHANGED  font-scale cap on the subject button's name and best
README.md              CHANGED  describes all three subjects (it still describes Math only)
```

Unchanged: `reducer.ts`, `scoring.ts`, `difficulty.ts`, `random.ts`, `math.ts`, `question.ts`, the HUD, answer pad, hero and starfield. They already read everything subject-specific from the registry or the question.

### Shared engine (`src/game/bank.ts`)

This is `english.ts` renamed with `git mv`. Its behaviour does not change; the names become neutral:

| Before | After |
|---|---|
| `EnglishItem` (in `english-bank.ts`) | `BankItem` (in `bank.ts`) |
| `bandsForLevel(level)` | `bandsForLevel(level)`, unchanged |
| `englishFallMs(level)` | `sentenceFallMs(level)`, same values |
| `makeEnglishQuestion(level, rng, id, usedKeys, bank = ENGLISH_BANK)` | `makeBankQuestion(bank, level, rng, id, usedKeys)`: bank first, no default |
| Error `No English sentences for level N` | Error `No questions for level N` |

`bank.ts` imports no bank data. The data files import the `BankItem` type from it.

`makeBankQuestion(bank, level, rng, id, usedKeys)` behaves exactly like `makeEnglishQuestion` does today:
1. **Pool:** the items whose band is in `bandsForLevel(level)`. If the pool is empty, throw.
2. **Pick:** choose uniformly (with `rng`) among pool items whose id is not in `usedKeys`. If every pool item has been used, choose from the whole pool.
3. **Build:**
   - `key = item.id`
   - `prompt = item.sentence`
   - `answer = item.answer`
   - `choices = shuffle([answer, ...wrong])`
   - `reveal` is the text before and after `___`

### Subjects (`src/game/subjects.ts`)

```ts
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
```

| id | name | shortName | badge | card | fallMs | makeQuestion |
|---|---|---|---|---|---|---|
| `math` | Mathematics | MATH | `+−×÷` | `short` | `configForLevel(level).fallMs` | `makeMathQuestion` (ignores `usedKeys`) |
| `english` | English | ENGLISH | `Aa` | `sentence` | `sentenceFallMs` | `makeBankQuestion(ENGLISH_BANK, …)` |
| `science` | Science | SCIENCE | `H₂O` | `sentence` | `sentenceFallMs` | `makeBankQuestion(SCIENCE_BANK, …)` |

`SUBJECT_IDS = ['math', 'english', 'science']` is the picker order.

### UI data flow

- **`layout.ts`:** `cardSizeFor(card: CardKind, playAreaWidth)`. The sizes are unchanged:
  - `'sentence'` → `{ width: max(0, min(playAreaWidth − 32, 360)), height: 104 }`
  - `'short'` → `{ width: 168, height: 64 }`
- **`falling-question.tsx`:**
  - The `card: CardKind` prop replaces `subject: SubjectId`.
  - `CardText` checks `card === 'sentence'` where it checked `subject === 'english'`. That branch controls the blank gap, 3 lines, 22 px text and the 0.6 minimum scale.
  - Nothing else in the component changes, including the load-bearing effect order.
- **`game-screen.tsx`:** passes `card={SUBJECTS[subject].card}` to `FallingQuestion`.
- **`overlay.tsx`:** `maxFontSizeMultiplier={1.4}` on the subject button's name and "Best N" texts.
- **`best-score-keys.ts`:** adds `science: 'quiz-shooter:best-score:science'`. The Math and English keys are unchanged, so saved bests carry over.
- **`use-best-scores.ts`:** the initial state becomes `{ math: 0, english: 0, science: 0 }`. Loading already loops over `SUBJECT_IDS`.
- **`README.md`:** describes the three subjects.

## 4. Testing & Verification

**Unit tests** (jest-expo, written before the code, in `__tests__/`):

- **`game/bank-content-test.ts`** (`git mv` from `english-bank-test.ts`): a `describe.each` over English (`en`) and Science (`sci`) that checks every mechanical rule in §2, including the new 60-character sentence and 16-character choice limits.
- **`game/bank-test.ts`** (`git mv` from `english-test.ts`):
  - The `bandsForLevel` table and the `sentenceFallMs` table (same values as today).
  - `makeBankQuestion` with a small fake bank:
    - no repeats until the pool is used up, then reuse
    - a clear error naming the level when it has no items
    - deterministic for a seed
    - the answer is not always first
  - With each real bank (`ENGLISH_BANK` and `SCIENCE_BANK`):
    - questions come from the level's bands
    - the choices are the answer plus the three wrong fills, with exactly one answer
    - `reveal.before + answer + reveal.after` equals the sentence with the blank filled in
    - band 1 never repeats while fresh items remain
- **`game/subjects-test.ts`:**
  - `SUBJECT_IDS` is math, english, science, each keyed by its own id.
  - Names, short names and badges match the table in §3.
  - Card kinds: math `short`, english and science `sentence`.
  - Fall times: math uses `configForLevel`; english and science use `sentenceFallMs`.
  - English and Science draw from their own banks and honour `usedKeys`. Math ignores `usedKeys`.
- **`components/layout-test.ts`:** the same sizes as today, looked up by card kind:
  - `'short'` → 168×64
  - `'sentence'` → 288 / 358 / 360 wide × 104 tall at play widths 320 / 390 / 800
  - width 0 before layout
- **`hooks/best-score-keys-test.ts`:** the Math and English keys are unchanged, and Science has its own key.
- **`game/reducer-test.ts`:** `START` with `science` sets the subject and draws the first question from `SCIENCE_BANK` band 1.

**Content review:** as described in §2.

**Manual (human, Expo Go on a phone):**
- The picker shows three subjects and fits a small phone, including at large OS text sizes.
- A Science run end to end:
  - falling sentences and correct shots
  - the reveal after a landing, and after a final wrong tap
  - Play again and Change subject
- Long Science sentences and answers on a small screen.
- The Science best score is saved and shown separately.

**Done means** `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass.

## Out of Scope

- A Science-specific fall speed. Science reuses English's until playtesting says otherwise.
- Images or diagrams on cards.
- Explanations beyond the reveal.
- More subjects or other languages.
- Online or AI-generated content.
