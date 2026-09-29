# Quiz Shooter — Design Spec

Date: 2026-09-29
Status: Approved (pending written-spec review)

## Purpose

A casual brain-training game for all ages. Simple math questions fall from the
top of the screen toward the hero. The player taps the correct answer from four
choices; the hero's gun fires, the question breaks apart, and the next one
drops. Difficulty ramps with score; players chase a persisted high score.

## Decisions

| Topic | Decision |
|---|---|
| Audience | Casual brain training, all ages, high-score chase |
| Active questions | One at a time |
| Lives | 3; wrong tap and question reaching hero each cost 1 |
| App structure | Replace template tabs with a single game route |
| Tech approach | Reanimated animations + pure TypeScript game logic |
| Platforms | iOS/Android portrait (Expo Go compatible), web as bonus |

## 1. Game Rules

### Questions

A question is `a <op> b` with one operator. The level decides allowed operators,
operand ranges, and fall duration (top of play area to hero line):

| Level | Reached at score | Operators | Operand ranges | Fall time |
|---|---|---|---|---|
| 1 | 0 | `+` | 1–10 | 8000 ms |
| 2 | 5 | `+ −` | 1–20 | 7000 ms |
| 3 | 10 | `+ − ×` | `+ −`: 1–20; `×`: 2–10 | 6000 ms |
| 4 | 20 | `+ − × ÷` | `+ −`: 1–50; `×`: 2–12; `÷`: divisor 2–10, quotient 2–10 | 5000 ms |
| 5+ | 30, then every +10 | all | `+ −`: 1–(50 + 25·(level−4)); `×`: 2–(12 + level−4); `÷`: quotient 2–(10 + level−4) | 5000 − 400·(level−4), floor 2500 ms |

Constraints:
- Subtraction: operands ordered so the result is ≥ 0.
- Division is generated backwards: pick quotient `q` and divisor `d`, dividend
  is `q·d`. The result is always an integer.
- Display operators as `+`, `−`, `×`, `÷`.

### Choices

- Exactly 4 choices: 1 correct and 3 distractors, all distinct and ≥ 0.
- Distractors are near the answer: offsets ±1…±3 for answers < 20, and a mix of
  ±1…±3 and ±10 for answers ≥ 20.
- Order is shuffled per question.

### Scoring, lives, level

- Correct answer: `1 + speedBonus`, where `speedBonus` is 2 if the question's
  fall progress is < 1/3, 1 if < 2/3, otherwise 0. Progress runs from 0 (top)
  to 1 (hero line).
- `level = levelForScore(score)`, using the thresholds in the table above.
- Lives start at 3.
- A wrong tap costs 1 life, marks that choice as disabled for the current
  question, and the question keeps falling.
- A question reaching the hero costs 1 life and the next question spawns.
- Lives reaching 0 moves the game to `gameover`.

### Best score

- Persisted on-device with AsyncStorage under key `quiz-shooter:best-score`.
- Shown on the start and game-over overlays. Game over shows "New best!" when
  `score > previousBest`.
- If storage read/write fails, the game continues with best = in-memory value,
  and no error is surfaced.

## 2. Screen & Feel

Portrait, full-screen, safe-area aware, no tab bar. Always dark, regardless of
system theme.

```
┌─────────────────────────┐
│ ♥♥♥      LV 3    127  ⏸ │  HUD
│       ┌─────────┐       │
│       │  7 × 6  │ ↓     │  falling question card
│       └─────────┘       │
│            ┊            │  bullet path (only while firing)
│          ▲              │
│        ▟███▙            │  hero + gun (fixed, centered)
├─────────────────────────┤  hero line (danger line)
│   [ 42 ]     [ 48 ]     │
│   [ 36 ]     [ 49 ]     │  2×2 answer pad
└─────────────────────────┘
```

- Visuals: deep navy background, slow drifting starfield, bright question card
  with a glowing border. The hero and gun are built from Views; no image assets.
- Correct answer: muzzle flash, a bullet travels to the card's current position
  (~150 ms), the card shatters into 4–6 fragments that scatter, spin and fade,
  and a floating "+N" appears. The next question spawns about 300 ms after the
  break finishes.
- Wrong tap: the button shakes and turns red (disabled), and the HUD loses a
  heart. The question keeps falling.
- Question hits hero: screen shake, hero flashes red, lose a life, next
  question.
- Haptics (`expo-haptics`): light impact on a correct answer, heavy impact on
  any life loss. Haptics calls are no-ops on web.
- Pause: automatic when AppState leaves `active`; manual via the HUD pause
  button. Paused overlay has a Resume button. While paused the fall freezes
  and answers are ignored.
- Answer pad is disabled while the bullet/break animation plays, so a new
  question can't be answered before it exists.
- Overlays on the same screen:
  - Start: title "Quiz Shooter", best score, Play.
  - Paused: Resume.
  - Game over: score, best, "New best!" badge when earned, Play again.

## 3. Architecture

```
src/
  app/
    _layout.tsx            Stack (headerShown: false), light status bar, no tabs
    index.tsx              renders <GameScreen/>
  game/                    pure TypeScript, no React/RN imports
    random.ts              seedable RNG (mulberry32): () => number in [0,1)
    difficulty.ts          levelForScore(score), configForLevel(level)
    questions.ts           makeQuestion(level, rng, id) -> Question
    scoring.ts             pointsFor(progress)
    reducer.ts             gameReducer(state, action), initialState
  components/game/
    game-screen.tsx        useReducer, best-score hook, haptics, AppState pause
    hud.tsx                lives, level, score, pause button
    falling-question.tsx   card fall, bullet, shatter animations
    hero.tsx               ship, gun, muzzle flash, damage flash
    answer-pad.tsx         2×2 buttons, wrong shake/disable
    overlay.tsx            start / paused / game-over panels
    starfield.tsx          background decoration
  hooks/
    use-best-score.ts      load on mount, save(score) when it is a new best
```

Removed template files: `src/app/explore.tsx`, `src/components/app-tabs*.tsx`,
and demo-only components/hooks no longer referenced (`animated-icon*`,
`external-link`, `hint-row`, `web-badge`, `ui/collapsible`, and the themed-*
components if unused). Remove `AnimatedSplashOverlay` usage. Keep
`SplashScreen.hideAsync()` behavior so the splash dismisses.

### Types

```ts
type Operator = '+' | '-' | '×' | '÷';
interface Question { id: number; text: string; answer: number; choices: number[] }
type Phase = 'ready' | 'playing' | 'paused' | 'gameover';
interface GameState {
  phase: Phase;
  score: number;
  level: number;
  lives: number;
  question: Question | null;
  disabledChoices: number[];   // wrong values tapped for the current question
  destroying: boolean;         // correct answer given, break animation running
  lastPoints: number;          // for the floating "+N"
  nextId: number;
}
```

### Actions

| Action | Allowed in | Effect |
|---|---|---|
| `START` | ready, gameover | reset score/lives/level, new question, phase = playing |
| `ANSWER {value, progress}` | playing, not destroying, value not disabled | correct: add points, update level, `destroying = true`; wrong: lives − 1, disable value, maybe gameover |
| `QUESTION_HIT` | playing, not destroying | lives − 1; gameover if 0, else new question |
| `DESTROY_DONE` | playing, destroying | new question, `destroying = false`, clear disabled |
| `PAUSE` | playing | phase = paused |
| `RESUME` | paused | phase = playing |

Actions outside their allowed phase return state unchanged. The reducer takes
an injected RNG (created once per game in `game-screen`) so tests are
deterministic.

### Animation data flow

- `falling-question` receives `question.id`, `fallMs`, `paused`, `destroying`.
- When `question.id` changes, it resets `y` to 0 and runs
  `withTiming(1, {duration: fallMs, easing: linear})` on a shared value. On
  natural completion it calls `onHit()` on the JS thread (via
  `scheduleOnRN` from `react-native-worklets`, or the API the installed
  version documents).
- Progress for scoring is read from the shared value when the button is
  pressed and passed into `ANSWER`.
- On `destroying`: cancel the fall (`cancelAnimation`), run the bullet then the
  shatter animation, then call `onDestroyed()` → `DESTROY_DONE`.
- Pause: `cancelAnimation` freezes `y`. Resume restarts
  `withTiming(1, {duration: fallMs·(1 − y)})`.
- Play-area height comes from `onLayout`; `y` (0..1) is mapped to pixels in
  `useAnimatedStyle`.

## 4. Testing & Verification

- Unit tests with `jest-expo` preset, written test-first for `src/game/*`:
  - Across many seeds and levels 1–10: results are non-negative integers,
    division is exact, and operators are allowed for the level.
  - Choices: length 4, distinct, all ≥ 0, exactly one equals the answer.
  - `levelForScore` thresholds; `configForLevel` fall times and floor.
  - `pointsFor` boundaries.
  - Reducer: every transition in the action table, ignored actions, gameover
    at 0 lives, disabled choices, and pause blocking answers.
- Animations and feel are checked manually: run the app on web, and the user
  tests on a phone in Expo Go.
- Done requires `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor`, and
  `npm test` to all pass.

## Dependencies

Install with `npx expo install`:
- `expo-haptics`
- `@react-native-async-storage/async-storage`
- dev: `jest-expo`, `jest`, `@types/jest`

## Out of Scope

Sound effects, multiple simultaneous questions, online leaderboards, settings
screen, custom sprites/art assets.
