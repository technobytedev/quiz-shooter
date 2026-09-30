# Quiz Shooter

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

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone, or press `w` in the terminal to
open it in the browser.

## Test, lint and typecheck

```bash
npm test
npx expo lint
npx tsc --noEmit
```

## Where the code lives

- `src/game/` - pure TypeScript game logic (subjects, question banks, difficulty, scoring, state
  reducer) with no React or React Native imports. Its unit tests are in `__tests__/game/`.
- `src/components/game/` - the game UI: screen, HUD, falling question, hero, answer pad, overlays.
- `src/app/` - Expo Router routes (a single game screen).
- `src/hooks/` - per-subject best-score persistence.
