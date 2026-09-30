# Player Names and Scoreboard — Design Spec

Date: 2026-09-30
Status: Approved in conversation (pending written-spec review)
Builds on: the four-subject game on `main` (Math, English, Science, Geography) and its 2×2 subject picker (`docs/superpowers/specs/2026-09-30-geography-mode-design.md`).

## Purpose

Several people share one phone and take turns. Today the game keeps one best score per subject for the whole phone, so nobody can tell who set it. This feature adds **offline player names**:
- Before playing, a player picks their saved name or creates a new one.
- Every game's score is credited to that player.
- A **scoreboard** ranks the players in each subject, so everyone can see who is best.

Everything stays on the phone. There are no accounts and no network access.

## Decisions

| Topic | Decision |
|---|---|
| Storage | Offline, on the phone only, with the existing `@react-native-async-storage/async-storage` |
| Scoreboard ranks | Each player's best score, per subject. Each player appears at most once per subject. |
| When the name is picked | Every time the menu opens ("Who's playing?"), before the subject picker. Play again keeps the same player and subject. |
| Old bests (from before names) | Moved to a saved player named **Player 1**, who can be renamed |
| Managing names | Create and rename. There is no delete. |
| Structure | "Who's playing?" is a menu panel, like the subject picker. The scoreboard is its own Expo Router screen. |
| Game logic | The reducer, subjects and question banks do not change |
| Packages | No new packages |

## 1. Player experience

### "Who's playing?" (the first menu panel)

- **Title:** "Who's playing?"
- **Tiles:** one per saved player, two per row, in the same style as the subject tiles. The most recently played player comes first. A new player counts as just played, so they come first too.
- **New player:** a **+ New player** tile, always last, opens the name form. Saving selects the new player straight away and moves on to the subject picker.
- **Choosing:** tapping a player's tile selects them and moves on to the subject picker.
- **Buttons below the tiles:**
  - **Scoreboard** opens the Scoreboard screen on the Math tab.
  - **Edit names** switches the panel to edit mode. In edit mode, tapping a player's tile opens the name form to rename them; the button reads **Done**, and **+ New player** is hidden.
- **Many players:** the panel's tile area scrolls when it doesn't fit on the screen.
- **Loading:** until the saved players have loaded, the panel shows only its title: no tiles, no **+ New player**, and no buttons. Nothing can be created before the old bests are moved over (§2).
- **No players yet:** the panel shows only the **+ New player** tile and the **Scoreboard** button. **Edit names** appears once there is at least one player.
- **Old bests:** on a phone that already has best scores from before this update, a **Player 1** tile holds them (§2).

### The name form

- **Title:** "New player", or "Rename <name>" when renaming.
- **Field:** a text field that is focused when the form opens. It capitalizes words, has autocorrect off, and allows at most 12 characters.
- **Buttons:** **Save** and **Cancel**. The keyboard's return key also saves.
- **Name rules** (checked on Save):
  - Spaces are trimmed from both ends, and runs of spaces inside the name become one space.
  - The cleaned name must be 1–12 characters long (`string.length`). An empty name shows "Type a name."
  - No two players may have the same name, ignoring capitals. A taken name shows "That name is taken." Renaming a player to their own name (even with different capitals) is allowed.
- **Rename:** changes only the name. The player keeps their scores and their place in the order.
- **Keyboard:** the whole form stays visible above the on-screen keyboard on iOS and Android.
- **Cancel:** returns to "Who's playing?" with nothing changed.

### Pick your subject

- **Unchanged:** the 2×2 grid of subject tiles from the Geography spec.
- **New line** under "Pick your subject": **Playing as <name> · Change**. Change returns to "Who's playing?".
- **Tiles:** each tile's "Best N" is now the selected player's best in that subject.

### During play and pause

- **Unchanged:** play, the HUD and the Pause panel's Resume.
- **Pause → Menu:** records the game's score for the player (as today) and returns to "Who's playing?".

### Game Over

- **Score:** "Score N" as today.
- **"Best N":** the player's best in this subject, after this game.
- **New best!** shows when this game's score is higher than the player's best in this subject before the game started. (Today's rule, applied per player.)
- **Rank line:** for example "2nd of 5 in Geography". It shows the player's place on this subject's scoreboard after this game counts. It is hidden when the player has no points in this subject.
- **Buttons:**
  - **Play again:** same player, same subject.
  - **Scoreboard:** opens the Scoreboard screen on this subject's tab, with this player highlighted.
  - **Menu:** returns to "Who's playing?". It replaces today's "Change subject".

### Scoreboard (its own screen)

- **Route:** `src/app/scoreboard.tsx`. It takes two optional search params: `subject` (the tab to open) and `player` (the id to highlight). A missing or unknown `subject` opens Math.
- **Leaving:** a **Back** button, the Android back button, and the iOS back swipe all return to the game screen exactly as it was left.
- **Title:** "Scoreboard".
- **Tabs:** one per subject, in `SUBJECT_IDS` order. Each tab shows the subject's badge and name. The name stays on one line and shrinks to fit, and text is capped at 1.4×.
- **Rows:** rank, name, best. Rows are sorted by best, highest first.
  - Equal bests share a rank, and the next rank skips (1, 2, 2, 4). Tied players are ordered by name (A–Z, ignoring capitals).
  - Only players with a best of at least 1 in that subject are listed.
  - The highlighted player's row has the glowing border.
- **Empty tab:** "No games yet."
- **Updates:** the screen always shows the scores saved a moment ago. It reads the app's single shared copy of the players (§3).
- **Many rows:** the list scrolls.

## 2. Data and storage

### What is stored

One AsyncStorage key, `quiz-shooter:players`, holds JSON:

```json
{
  "version": 1,
  "players": [
    {
      "id": "p-1790000000000-4821",
      "name": "Maya",
      "best": { "math": 30, "english": 0, "science": 12, "geography": 42 },
      "lastPlayedAt": 1790000000000
    }
  ]
}
```

- **`id`:** made when the player is created, from the time and a random number. It is never shown and never changes.
- **`name`:** the cleaned name.
- **`best`:** one entry per subject id. Each value is a whole number, 0 or more.
- **`lastPlayedAt`:** milliseconds since 1970. It is set when the player is created and whenever one of their games is recorded.

### Recording a game

When a game ends, either at Game Over or through Pause → Menu, the store updates the selected player:
- their best for that subject becomes the larger of their best and the game's score
- `lastPlayedAt` becomes now, even when the score is 0

It then saves.

### Loading

The store loads once, when the app starts.

- **Parsed defensively:**
  - An entry is skipped when its `id` is not a non-empty string, or its `name` is not a string that is 1–12 characters long after cleaning.
  - If two entries share an id, the first one is kept.
  - A best that is missing, or not a whole number of 0 or more, counts as 0. A subject added later therefore needs no migration.
  - A `lastPlayedAt` that is missing or not a number counts as 0.
- **Unreadable data:** if the stored text is not valid JSON, or is not an object with `version` 1 and a `players` list:
  - The raw text is first copied to `quiz-shooter:players:damaged`.
  - The game then starts with an empty list.
  - If that copy fails, the game keeps running but saves nothing for the rest of the session, so the unreadable data is never overwritten without a copy.

### Moving the old bests to Player 1 (one time)

The first time the app loads and `quiz-shooter:players` does not exist, the store reads the four old keys in `src/hooks/best-score-keys.ts`:

| Subject | Old key |
|---|---|
| Math | `quiz-shooter:best-score` |
| English | `quiz-shooter:best-score:english` |
| Science | `quiz-shooter:best-score:science` |
| Geography | `quiz-shooter:best-score:geography` |

- If any old best is above 0, the store creates **Player 1** with those bests.
- If all are 0 or missing, it creates no player.
- Either way it then saves `quiz-shooter:players`, so this happens only once.
- The old keys are never changed or deleted. Once the new key exists, they are ignored.

### Failures

As today, storage errors never stop the game. A failed read or write is ignored, and the game continues with the players in memory. The exceptions are the "saves nothing" rule for unreadable data above, and two failed reads that also turn saving off for the session: a failed read of `quiz-shooter:players`, and a failed read of an old key during the move to Player 1. In the second case the move runs again on the next launch, so no old best is lost.

## 3. Architecture

```
src/game/players.ts                               NEW      pure player logic (no React, no storage)
src/hooks/players-storage.ts                      NEW      load / save through a small storage interface
src/hooks/players-store.tsx                       NEW      PlayersProvider + usePlayers(): the app's one shared copy
src/components/game/player-panel.tsx              NEW      "Who's playing?" panel and edit mode
src/components/game/name-form.tsx                 NEW      the create / rename form
src/app/scoreboard.tsx                            NEW      Scoreboard route
src/components/scoreboard/scoreboard-screen.tsx   NEW      tabs and ranked rows
src/app/_layout.tsx                               CHANGED  wraps the Stack in PlayersProvider
src/components/game/overlay.tsx                   CHANGED  player step, "Playing as" line, Game Over rank, Scoreboard and Menu buttons
src/components/game/game-screen.tsx               CHANGED  holds the chosen player and records each game for them
src/hooks/best-score-keys.ts                      CHANGED  comment only: the old keys are now read once, for Player 1
src/hooks/use-best-scores.ts                      REMOVED  replaced by the players store
README.md                                         CHANGED  describes players and the scoreboard
```

**Unchanged:** the reducer, `subjects.ts`, the question banks, the HUD, the answer pad, the falling card, the hero and the starfield.

### `src/game/players.ts` (pure)

Everything here is a pure function over plain data, so it is unit-tested directly. The implementation plan fixes the exact names and signatures. It provides:
- the `Player` type (the stored shape above) and `MAX_NAME_LENGTH = 12`
- **name rules:** clean a name, and check it (empty, too long, or taken), allowing a rename to the player's own name
- **changes:** add a player (given an id and a time), rename a player, record a game's score
- **orders:** "most recent first" for the "Who's playing?" panel; a subject's scoreboard rows with shared ranks; one player's rank and the number of ranked players
- **words:** ordinal words for the rank line (1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 101st, 111th)
- **Player 1:** building it from the four old bests (no player when all are 0)
- **reading and writing:** parsing stored JSON into players by the rules in §2, and serializing players back

### `src/hooks/players-storage.ts`

`loadPlayers` and `savePlayers` take a minimal storage interface (`getItem` and `setItem`, each returning a promise). The app passes AsyncStorage; tests pass an in-memory fake. `loadPlayers` owns the Player 1 move, the damaged-data copy, and the "saves stay off" outcome. This file imports no React and no React Native.

### `src/hooks/players-store.tsx`

- `PlayersProvider` loads once on mount and keeps the players in React state. It saves after every change, skipping the save when saves are off.
- `usePlayers()` returns:
  - whether loading has finished
  - the players
  - create a player: it returns the new player's id, or the name error
  - rename a player: it returns nothing, or the name error
  - record a game
- The provider wraps the root `Stack` in `src/app/_layout.tsx`, so the game screen and the Scoreboard screen share one copy.

### Game screen and menu

- **Chosen player:** `GameScreen` keeps the chosen player's id as UI state.
  - No player chosen: the `ready` panel is "Who's playing?".
  - A player chosen: the `ready` panel is the subject picker.
  - Pause → Menu and Game Over → Menu clear the choice. Play again keeps it.
  - The reducer never sees the player.
- **Recording a game:** `GameScreen` records each game for the chosen player, where it submits the best today (Game Over and Pause → Menu).
  - "New best!" compares against that player's best when the game began, as today.
- **Opening the Scoreboard:** the Scoreboard button calls `router.push` with the `subject` and `player` params.
- **Returning:** leaving the Scoreboard pops back to the game screen, whose state is untouched.

## 4. Testing and verification

**Unit tests** (written before the code), in `__tests__/`, named `*-test.ts`, importing source by relative path:

- **`__tests__/game/players-test.ts`:**
  - Name cleaning: trimming, and collapsing inner spaces.
  - Name errors:
    - empty, and all spaces
    - 13 characters rejected, 12 allowed
    - a taken name, ignoring capitals
    - renaming to your own name in different capitals, allowed
  - Add: the id and name are stored, all bests are 0, and `lastPlayedAt` is set.
  - Rename: the id, bests and `lastPlayedAt` are kept.
  - Record:
    - a higher score raises the best, and a lower score leaves it
    - only that subject changes
    - `lastPlayedAt` updates even for a score of 0
    - an unknown id changes nothing
  - Most-recent-first order.
  - Scoreboard rows:
    - highest first
    - shared ranks 1, 2, 2, 4
    - ties ordered by name
    - players with 0 left out
    - an empty subject gives no rows
  - A player's rank and the number ranked; no rank for a player with 0.
  - Ordinal words: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 101st, 111th.
  - Player 1: built from the old bests when any is above 0; no player when all are 0.
  - Parsing:
    - valid data round-trips
    - malformed entries are skipped
    - duplicate ids keep the first
    - missing or invalid bests become 0
    - invalid JSON and an unknown version are reported as unreadable
- **`__tests__/hooks/players-storage-test.ts`** (with an in-memory fake storage):
  - The first load with old bests creates Player 1 and saves the new key.
  - The first load with no old bests saves an empty list and creates no Player 1.
  - A later load ignores the old keys.
  - Unreadable data is copied to the damaged key, then the load returns an empty list.
  - A failed copy returns "saves off".
  - A failed read of an old best returns "saves off" and saves nothing.
  - A failed read or write never throws.
- **Existing tests stay green.** `__tests__/hooks/best-score-keys-test.ts` keeps pinning the four old keys, which the Player 1 move depends on.

The panels, the form and the Scoreboard screen are UI and have no unit test, as with the subject picker. The manual check covers them.

**Manual (human, Expo Go on a phone):**
- On a phone that already has bests: Player 1 appears with them, and renaming Player 1 keeps them.
- Creating a player, "That name is taken", "Type a name", and the 12-character limit.
- The keyboard never covers the name form, on iOS and on Android.
- Two players' scores stay separate: each tile's "Best N" follows the selected player.
- Game Over:
  - New best!
  - the rank line
  - Play again keeps the player
  - Menu returns to "Who's playing?"
- Scoreboard:
  - opens on the right tab with the right row highlighted
  - ties share a rank
  - an empty tab says "No games yet."
  - Back, the Android back button and the iOS swipe all return to the game
- The largest OS text size: the panels and the Scoreboard tabs still fit.

**Done means** `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass.

## Out of scope

- Deleting players.
- Syncing or sharing players between phones, and any online leaderboard.
- Avatars, colors or PINs for players.
- A history of individual games (dates, top-10 lists) and an overall ranking across subjects.
- Showing the player's name during play.
- Text-size caps on the Paused and Game Over panels. That is a pre-existing follow-up.
