# English Mode & Subject Picker — Design Spec

Date: 2026-09-29
Status: Approved in conversation (pending written-spec review)
Builds on: `docs/superpowers/specs/2026-09-29-quiz-shooter-design.md` (the Math game spec). Everything in that spec still applies unless this document changes it.

## Purpose

Add an English grammar subject to Quiz Shooter. When the app opens, the player picks **Mathematics** (the existing game) or **English**.

English questions are sentences with one blank. The player shoots the sentence down by picking the word or phrase that completes it with correct grammar, from four choices. The audience is all ages: English starts with basics and ramps into tricky usage.

Both subjects also gain a learning "reveal": the correct answer is shown when the player misses.

## Decisions

| Topic | Decision |
|---|---|
| English audience | Starts easy, gets tricky: basics → tenses → prepositions → trickier grammar → tricky usage |
| Miss feedback | Reveal the answer for 1.5 s when a question lands, or when a run ends on a wrong tap. Both subjects. |
| Architecture | One shared text-based `Question` and one question source per subject; the game engine and UI stay shared |
| English content | ~200 hand-written sentences in a bundled data file; works offline, no AI or network |
| Best scores | Separate per subject; Math keeps its existing storage key |
| Packages | No new packages |

## 1. Flow

**Subject picker.** This is the `ready` phase and replaces the old start overlay:
- Title "Quiz Shooter" and subtitle "Pick your subject".
- Two large buttons:
  - "Mathematics": badge `+−×÷`, "Best N"
  - "English": badge `Aa`, "Best N"
- Tapping a button starts a run in that subject immediately.

**HUD.** The centre shows the subject and the level, e.g. a small `ENGLISH` label above `LV 3`. It must fit on a 320 px-wide screen next to the hearts and the score/pause.

**Paused overlay:**
- Title "Paused", with **Resume** and **Menu** buttons.
- Menu counts the run's score toward that subject's best, then returns to the subject picker.

**Game-over overlay:**
- Title "Game Over", with the "New best!" badge when earned.
- "Score N" and "Best N" (this subject's best).
- **Play again** starts a new run in the same subject. **Change subject** returns to the subject picker.

**"New best!"** keeps its current rule, applied per subject: the score beats the best at run start and reaches the live best.

## 2. The reveal

**Triggers:**
- A question reaches the hero (every time, after the life is lost).
- A wrong tap costs the last life.

**Not triggered:**
- A wrong tap with lives remaining. The choice is disabled and the question keeps falling, as today.
- A correct answer, which shatters as today.

**Behaviour:**
- Lasts **1500 ms**.
- The card stays where it is: at the bottom after landing, or frozen mid-air after a final wrong tap.
- The card shows `reveal.before + answer + reveal.after`, with the answer in bold green. Use a green dark enough to read on the white card, e.g. `#0A8F4E`.
- The answer button holding the correct answer is highlighted green: green border and green-tinted background.
- The answer pad is locked while the reveal shows.
- Afterwards: 0 lives → game over; otherwise the next question falls from the top.

**Pause and timing:**
- Pausing during a reveal does not stop the reveal timer (like the shatter today).
- `REVEAL_DONE` is accepted while paused. The next question then stays frozen until Resume, or game over is shown.
- The reveal timer ignores the OS reduce-motion setting (`ReduceMotion.Never`), like the fall, bullet and shatter, because it is game timing.

**Existing life-loss effects stay:** a heavy haptic on any life loss, and screen shake plus hero flash when a question reaches the hero.

## 3. English content

### Levels and topic bands

The level comes from the score with the existing `levelForScore` thresholds: 0 / 5 / 10 / 20 / 30, then every +10.

| Band | Used at level | Topics | Example (correct first) |
|---|---|---|---|
| 1 | 1 | `a/an`, `am/is/are`, plurals, `this/these`, `have/has` | `I ___ a student.` → am / is / are / be |
| 2 | 2 | present `-s`, past `-ed`, present continuous `-ing`, `do/does`, `there is/are` | `Yesterday we ___ to the park.` → walked / walk / walks / walking |
| 3 | 3 | `in/on/at`, irregular past, comparatives/superlatives, `much/many`, `some/any` | `My birthday is ___ June.` → in / on / at / by |
| 4 | 4 | present perfect, `since/for`, adjective vs adverb, `I/me`, `who/which` | `She has lived here ___ 2019.` → since / for / from / during |
| 5 | 5 | `their/there/they're`, `your/you're`, `its/it's`, `then/than`, `fewer/less`, `who/whom`, `affect/effect` | `___ going to be late.` → They're / Their / There / Theirs |
| 4 + 5 | 6 and up | bands 4 and 5 pooled together | — |

### Item format (`src/game/english-bank.ts`)

```ts
interface EnglishItem {
  id: string;                        // "en-<band>-<nnn>", e.g. "en-3-017"; unique
  band: 1 | 2 | 3 | 4 | 5;
  sentence: string;                  // contains exactly one "___" (three underscores): the blank
  answer: string;                    // the one correct fill
  wrong: [string, string, string];   // three wrong fills
}
```

### Content rules (every item)

- Exactly one `___` in the sentence.
- **Exactly one choice is grammatical and natural in that exact sentence.** Every wrong choice must be clearly wrong there. Use context (time words like *yesterday*, *every day*, *right now*, *since 2019*, and plural or singular subjects) to rule out alternatives. Example: `He ___ football.` is not allowed, because *plays* and *played* both fit. Use `He ___ football every Sunday.` with no past-tense choice instead.
- All four choices are distinct, including when compared case-insensitively.
- Answer and wrong choices are 1–3 words, with no leading or trailing spaces.
- If the blank starts the sentence, all four choices are capitalised.
- Sentences are complete, natural, suitable for all ages, and end with `.`, `?` or `!`.
- No duplicate sentences. Ids are unique, and each item's `band` matches its id.
- At least **35 items per band**, target ~40 (≈200 total).

### Building an English question (`src/game/english.ts`)

`makeEnglishQuestion(level, rng, id, usedKeys)`:
1. **Pool:** band `min(level, 5)` for levels 1–5; bands 4 and 5 combined for level 6 and up.
2. **Pick:** choose uniformly (with `rng`) among pool items whose id is not in `usedKeys`. If every pool item has been used, choose from the whole pool (repeats resume).
3. **Build the question:**
   - `key = item.id`
   - `prompt = item.sentence`
   - `answer = item.answer`
   - `choices = shuffle([answer, ...wrong])`
   - `reveal.before` is the text before `___`, and `reveal.after` is the text after it.

**Fall time:** `englishFallMs(level)`:

| Level | 1 | 2 | 3 | 4 | 5 and up |
|---|---|---|---|---|---|
| Fall time | 12000 ms | 11000 ms | 10000 ms | 9000 ms | `9000 − 500·(level − 4)`, never below 6000 ms |

So level 5 is 8500 ms, and level 10 and up is 6000 ms.

### Math questions as text (`src/game/math.ts`)

- Generation rules are unchanged from the Math spec.
- Output converts to text:
  - `prompt` is `"a op b"`
  - `answer` is `String(result)`
  - `choices` are the numeric choices as strings
  - `key` is the prompt
  - `reveal` is `{ before: "<prompt> = ", after: "" }`
- Math ignores `usedKeys`, so repeats are allowed as today.
- Fall time is the existing `configForLevel(level).fallMs`.

**Scoring** (+3 / +2 / +1 by fall progress) and lives (3) are unchanged for both subjects.

## 4. Card and answer buttons

- **Math card:** unchanged. 168×64, one line, 30 px text that shrinks to fit.
- **English card:**
  - Width `min(playAreaWidth − 32, 360)`, height 104.
  - Up to 3 lines of 22 px text that shrinks to fit (minimum scale 0.6, max font scale 1.4).
  - The `___` marker is drawn as a visible underlined gap about four characters wide.
- **Card height and travel:** the travel distance uses the current subject's card height, so the card's bottom meets the hero line in both subjects. The bullet, burst and "+N" positions follow the same card height.
- **Answer buttons:**
  - Text is one line and shrinks to fit (minimum scale 0.6, max font scale 1.4), so 1–3-word choices fit.
  - During the reveal the correct button is highlighted green.

## 5. Architecture

```
src/game/
  question.ts       NEW      shared Question type
  subjects.ts       NEW      SubjectId, Subject interface, SUBJECTS registry
  math.ts           RENAMED  from questions.ts (git mv); text output + reveal
  english.ts        NEW      makeEnglishQuestion, englishFallMs
  english-bank.ts   NEW      EnglishItem type + ENGLISH_BANK data (~200 items)
  difficulty.ts     unchanged (levelForScore shared; configForLevel = Math levels)
  scoring.ts, random.ts  unchanged
  reducer.ts        CHANGED
src/hooks/use-best-score.ts         CHANGED  per-subject bests
src/components/game/overlay.tsx     CHANGED  subject picker, pause Menu, Change subject
src/components/game/hud.tsx         CHANGED  subject label
src/components/game/falling-question.tsx  CHANGED  per-subject card, blank + reveal rendering, reveal timer
src/components/game/answer-pad.tsx  CHANGED  text choices, shrink-to-fit, reveal highlight
src/components/game/game-screen.tsx CHANGED  subject wiring, Menu, per-subject best
src/components/game/layout.ts       CHANGED  per-subject card sizes
src/components/game/colors.ts       CHANGED  reveal colours
```

### Shared types

```ts
// question.ts
interface Question {
  id: number;                                // unique per run (as today)
  key: string;                               // content id used to avoid repeats
  prompt: string;
  answer: string;
  choices: string[];                         // 4, shuffled, distinct, exactly one === answer
  reveal: { before: string; after: string }; // shown as before + answer + after
}

// subjects.ts
type SubjectId = 'math' | 'english';
interface Subject {
  id: SubjectId;
  name: string;       // "Mathematics" | "English"
  shortName: string;  // "MATH" | "ENGLISH"
  badge: string;      // "+−×÷" | "Aa"
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}
const SUBJECTS: Record<SubjectId, Subject>;
```

### Reducer state

New or changed fields are marked:

```ts
interface GameState {
  phase: Phase;                 // 'ready' | 'playing' | 'paused' | 'gameover'
  subject: SubjectId;           // NEW — initial 'math'; set by START
  score: number;
  level: number;
  lives: number;
  question: Question | null;
  disabledChoices: string[];    // CHANGED — text
  destroying: boolean;
  revealing: boolean;           // NEW
  lastPoints: number;
  nextId: number;
  usedKeys: string[];           // NEW — keys asked this run; reset by START
  damageCount: number;          // only increases, across runs (unchanged rule)
  hitCount: number;             // only increases, across runs (unchanged rule)
}
```

### Actions

Actions outside their allowed state return the same state object, as today.

| Action | Allowed when | Effect |
|---|---|---|
| `START {subject}` | ready, gameover | Reset the run (score 0, level 1, lives 3, `usedKeys` [], not destroying/revealing). Set `subject`. First question comes from that subject. Keep `nextId`, `damageCount`, `hitCount`. |
| `ANSWER {questionId, value: string, progress}` | playing, question present, not destroying, not revealing, `questionId` matches, value not disabled | **Correct:** add `pointsFor(progress)`, update level, `destroying = true`. **Wrong:** lose a life (`damageCount + 1`) and disable the value. If that was the last life, `revealing = true` (phase stays `playing`, question kept). |
| `QUESTION_HIT` | playing, question present, not destroying, not revealing | `hitCount + 1`, lose a life, `revealing = true` (question kept) |
| `REVEAL_DONE` | playing or paused, revealing | `revealing = false`. Lives 0 → phase `gameover`, question null. Otherwise the next question. |
| `DESTROY_DONE` | playing or paused, destroying | Next question (unchanged) |
| `PAUSE` / `RESUME` | playing / paused | Unchanged |
| `QUIT` | paused, gameover | Phase `ready`, question null, not destroying or revealing, `disabledChoices` []. Keep `nextId`, `damageCount`, `hitCount`. |

**Next question:** `SUBJECTS[state.subject].makeQuestion(state.level, rng, state.nextId, state.usedKeys)`. Append the question's `key` to `usedKeys`, increment `nextId`, and clear `disabledChoices`.

### UI data flow

- **`falling-question`** gets `subject`, `revealing` and `onRevealed` in addition to today's props.
  - The fall effect is also gated on `revealing`, so the card freezes; cleanup cancels the fall.
  - When `revealing` turns true, a 1500 ms reveal timing (`ReduceMotion.Never`) runs and then calls `onRevealed` through `scheduleOnRN` → `REVEAL_DONE`.
  - A new question resets the reveal value together with the other resets, in the existing reset effect. That effect stays declared above the fall effect.
  - The card is hidden while shattering, or once landed **unless revealing**. This keeps the no-flash fix for the next question.
- **`answer-pad`** gets `choices: string[]`, `disabledChoices: string[]` and `highlightedChoice: string | null` (the answer while revealing). It is locked when not playing, destroying or revealing.
- **`game-screen`:**
  - Passes `SUBJECTS[subject].fallMs(level)`.
  - Submits the score to the subject's best on game over (effect) and on pause → Menu (handler, before `QUIT`).
  - "Play again" dispatches `START` with the current subject.
- **`use-best-score`** becomes per subject: `{ best: Record<SubjectId, number>; submit(subject, score) }`.
  - It loads both keys on mount.
  - Math key: `quiz-shooter:best-score` (unchanged, so existing bests carry over). English key: `quiz-shooter:best-score:english`.
  - Storage failures are still swallowed.

## 6. Testing & Verification

**Unit tests** (jest-expo, written before the code, in `__tests__/game/`):

- **`english-bank-test.ts`:** covers every content rule that can be checked mechanically:
  - one `___`
  - 3 wrong fills, all four choices distinct case-insensitively
  - trimmed, 1–3 words
  - capitalised choices when the blank starts the sentence
  - sentence ends with `.`/`?`/`!`
  - unique ids matching `en-<band>-<nnn>` and the item's band
  - no duplicate sentences
  - ≥ 35 items per band
- **`english-test.ts`:**
  - Level → pool mapping (1–5, 6+ = bands 4+5).
  - No repeats until the pool is used up, then reuse.
  - 4 distinct choices with exactly one equal to the answer.
  - `reveal.before + answer + reveal.after` equals the sentence with `___` replaced.
  - Deterministic for a seed.
  - `englishFallMs` table and the 6000 ms floor.
- **`math-test.ts`** (renamed from `questions-test.ts`): existing checks adapted to text answers, plus key/reveal format (`"7 × 6 = "` + `"42"`).
- **`subjects-test.ts`:** the registry exposes both subjects, and their `fallMs` and `makeQuestion` delegate correctly.
- **`reducer-test.ts`:**
  - Existing tests adapted to text answers.
  - START sets the subject, and questions come from it.
  - `usedKeys` grows per question and resets on START.
  - QUESTION_HIT → revealing with the question kept. Answers and hits are ignored while revealing.
  - REVEAL_DONE → next question, or game over at 0 lives.
  - A final wrong tap → revealing, then game over after REVEAL_DONE.
  - REVEAL_DONE while paused.
  - QUIT from paused and gameover, and ignored elsewhere.
  - All existing guards still hold.

**Content review:** a separate review pass reads every sentence in the bank against the content rules, especially the one-right-answer rule and natural English. Ambiguous items are fixed or replaced. The user may also skim the data file.

**Manual (human, Expo Go on a phone):**
- Both subjects end to end: the picker, Menu and Change subject.
- The reveal after a landing and after a final wrong tap.
- Long English sentences on a small screen, and large OS text sizes.

**Done means** `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass.

## Out of Scope

- Sound effects.
- More subjects.
- In-app editing of sentences.
- A mistakes-review list at game over.
- Spaced repetition.
- Other languages.
- Online or AI-generated content.
