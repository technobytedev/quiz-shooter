# Player Names and Scoreboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let several people share one phone: each picks or creates an offline player name before playing, every game's score is credited to that player, and a Scoreboard screen ranks the players in each subject.

**Architecture:**
- **Pure logic:** `src/game/players.ts` holds the player logic: name rules, recording games, ranking, parsing. It has no React and no storage, so it is unit-tested directly.
- **Storage:** `src/hooks/players-storage.ts` loads and saves through a small storage interface, so its tests use an in-memory fake. It also owns the one-time move of the old bests to "Player 1".
- **Shared copy:** `PlayersProvider` (`src/hooks/players-store.tsx`) wraps the router, so the game screen and the Scoreboard screen share one copy of the players.
- **Menu:** "Who's playing?" is a new menu panel before the subject picker.
- **Scoreboard:** a new Expo Router screen, `src/app/scoreboard.tsx`.
- **Unchanged:** the reducer, the subjects and the question banks.

**Tech Stack:** Expo SDK 57, Expo Router (typed routes on), React 19.2 (React Compiler on), React Native 0.86, Reanimated 4.5, `@react-native-async-storage/async-storage` 2.2, jest-expo, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-09-30-player-names-design.md`. It builds on `docs/superpowers/specs/2026-09-30-geography-mode-design.md`.

## Global Constraints

- **No new packages.** If one ever seems needed, stop and report.
- **Expo and React Native APIs were checked against the current docs** (AGENTS.md requires it), and they are used exactly as follows:
  - `KeyboardAvoidingView` with `behavior="padding"` on both platforms. The React Native docs recommend setting `behavior` on both.
  - `router.push({ pathname, params })` in object form, and `useLocalSearchParams<{ subject?: string; player?: string }>()` for search params, which arrive as `string | undefined`.
  - Typed routes are on (`app.json` → `experiments.typedRoutes`). After a new route file is added, `npx expo customize tsconfig.json` regenerates `.expo/types/router.d.ts` without the dev server. It leaves `tsconfig.json` unchanged. Until it has run, `tsc` rejects `pathname: '/scoreboard'`.
  - React 19 context: `<PlayersContext value={…}>` as the provider, and `use(PlayersContext)` to read it.
- `src/game/**` must not import React, React Native, or Expo modules.
- Tests live in `__tests__/` (subfolders allowed) and are named `*-test.ts`. They import source by relative path. Files they import may use `@/…` only as `import type`, which is erased at test time. For that reason `src/hooks/players-storage.ts` imports `../game/…` relatively.
- **Storage keys:**
  - New: `quiz-shooter:players` (the players) and `quiz-shooter:players:damaged` (a copy of unreadable saved players).
  - Old and unchanged, now only read, once: Math `quiz-shooter:best-score`, English `quiz-shooter:best-score:english`, Science `quiz-shooter:best-score:science`, Geography `quiz-shooter:best-score:geography`.
- **Name rules (spec §1):**
  - Trim both ends and collapse runs of spaces inside to one space.
  - The cleaned name must be 1–12 characters (`string.length`), so `MAX_NAME_LENGTH = 12`.
  - Names must be unique ignoring capitals. A player may keep their own name when renaming.
- **Text:** every new text has `maxFontSizeMultiplier={1.4}`. The existing Paused and Game Over texts keep their current (uncapped) sizes; capping them is out of scope.
- Work on branch `feat/player-names` (it already holds the spec). Always `git add` explicit paths; never `git add -A` or `git add .`.
- Commit messages end with a blank line, then exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Done means** `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` and `npm test` all pass. All four pass on the branch today, with 727 tests.

## Review Focus

1. **A game credited to the wrong player, counted twice, or lost.** The chosen player lives in `GameScreen` as UI state, so no unit test covers this wiring.
   - Game Over records the game once, for the chosen player.
   - Pause → Menu records the unfinished game. Game Over → Menu does not record it again.
   - Play again keeps the player. Menu and Change clear the player.
   - Task 3's review must trace each of these paths in `game-screen.tsx`, and Task 5's device check plays two players.
2. **Upgrading players losing their bests.** The move to "Player 1" is pinned by `players-storage-test.ts` (Task 2), and the old keys by `best-score-keys-test.ts`. Task 5's device check repeats it on a phone that already has bests.
3. **Everyone's scores wiped by one bad read.**
   - Unreadable saved players are copied aside before anything is saved over them.
   - A failed read turns saving off for the session.
   - Both are pinned by `players-storage-test.ts` (Task 2).
4. **The on-screen keyboard covering the name form** (Android edge-to-edge in particular). There is no unit test; Task 5's device check covers it on both platforms.
5. **Scoreboard navigation.** Back, the Android back button and the iOS swipe must return to the game screen exactly as it was left. A web refresh on `/scoreboard` must still have a way back. Task 4's static web export proves the route renders; Task 5's device check covers the rest.

## Plan decisions not spelled out in the spec

- **The code in this plan has already been built and checked**, in a throwaway copy of this branch:
  - `npx tsc --noEmit` and `npx expo lint` passed with no warnings, and `npm test` passed with 773 tests.
  - A static web export rendered both routes.
  - The end of Task 3 (no Scoreboard yet) was checked the same way.
- **Shared menu parts:** `src/components/game/menu-parts.tsx` gets the menu buttons and tile styles that `overlay.tsx` has today. The overlay, the "Who's playing?" panel, the name form and the Scoreboard screen then share them. This part is behavior-preserving: the buttons and tiles look exactly as before.
- **A failed read also turns saving off.** If reading `quiz-shooter:players` itself fails, saving stays off for the session. The spec's rule for unreadable data is to never save over what could not be read, and this applies the same rule.
- **Game Over "Best":** it shows the larger of the saved best and this game's score, so it never shows a stale value for the one frame before the recorded game arrives.
- **Game Over → Menu does not record the game a second time.** It was already recorded at Game Over. Pause → Menu records the unfinished game.
- **The "Who's playing?" panel:**
  - Player names on tiles shrink to fit down to 0.6.
  - The **+ New player** tile has the quieter border (`GameColors.buttonBorder`).
  - Edit mode shows the subtitle "Tap a name to rename it".
- **The name form:** its title shrinks to one line, so "Rename Christopher" fits. The too-long message "Use 12 characters or fewer." exists for completeness; the field's `maxLength` means players never see it.
- **The subject picker keeps its "Quiz Shooter" title.** The "Playing as <name> · Change" line sits under "Pick your subject".
- **Player ids:** they look like `p-<milliseconds>-<0–9999>`.
- **Scoreboard screen:**
  - A "‹ Back" button sits beside the title.
  - When there is no screen to go back to (a web refresh on `/scoreboard`), Back replaces the route with `/`.
  - Tabs use `accessibilityRole="tab"` inside a `tablist`.
- **Task order:**
  - Tasks 1–2 are the tested logic.
  - Task 3 brings players into the menu and Game Over, without Scoreboard buttons.
  - Task 4 adds the Scoreboard screen and its two buttons. Task 3 cannot add the buttons, because `router.push('/scoreboard')` only typechecks once the route exists.

## File Map

| File | Task | Responsibility |
|---|---|---|
| `src/game/players.ts` | 1 | `Player`, name rules, add, rename, record, orders, ranks, ordinals, Player 1, parse and serialize |
| `__tests__/game/players-test.ts` | 1 | 36 tests |
| `src/hooks/players-storage.ts` | 2 | `loadPlayers`, `savePlayers`, keys, `KeyValueStorage` |
| `__tests__/hooks/players-storage-test.ts` | 2 | 10 tests with an in-memory fake storage |
| `src/hooks/best-score-keys.ts` | 2 | Comment only: the old keys are read once, for Player 1 |
| `src/components/game/menu-parts.tsx` | 3 | Shared `PrimaryButton`, `SecondaryButton`, `menuStyles` |
| `src/hooks/players-store.tsx` | 3 | `PlayersProvider`, `usePlayers()` |
| `src/app/_layout.tsx` | 3 | Wraps the `Stack` in `PlayersProvider` |
| `src/components/game/name-form.tsx` | 3 | Create and rename form |
| `src/components/game/player-panel.tsx` | 3, 4 | "Who's playing?" panel, edit mode (Scoreboard button in Task 4) |
| `src/components/game/overlay.tsx` | 3, 4 | Player step, "Playing as" line, Game Over rank and Menu (Scoreboard button in Task 4) |
| `src/components/game/game-screen.tsx` | 3, 4 | Chosen player, recording games (opening the Scoreboard in Task 4) |
| `src/hooks/use-best-scores.ts` | 3 | Removed |
| `src/components/scoreboard/scoreboard-screen.tsx` | 4 | Tabs and ranked rows |
| `src/app/scoreboard.tsx` | 4 | Scoreboard route |
| `README.md` | 4 | Players and the Scoreboard |

---

### Task 1: Player logic

**Files:**
- Create: `src/game/players.ts`
- Test: `__tests__/game/players-test.ts`

**Interfaces:**
- Consumes: `SUBJECT_IDS: readonly SubjectId[]` and `type SubjectId = 'math' | 'english' | 'science' | 'geography'` from `src/game/subjects.ts`.
- Produces (in `src/game/players.ts`):
  - `MAX_NAME_LENGTH = 12`, `LEGACY_PLAYER_NAME = 'Player 1'`
  - `interface Player { id: string; name: string; best: Record<SubjectId, number>; lastPlayedAt: number }`
  - `type NameError = 'empty' | 'too-long' | 'taken'`
  - `interface ScoreRow { rank: number; player: Player; best: number }`
  - `cleanName(raw: string): string`
  - `nameError(raw: string, players: readonly Player[], renamingId?: string): NameError | null`
  - `bestsFrom(source: Readonly<Record<string, unknown>>): Record<SubjectId, number>`
  - `addPlayer(players, raw, id: string, now: number): Player[]`
  - `renamePlayer(players, id, raw): Player[]`
  - `recordGame(players, id, subject: SubjectId, score: number, now: number): Player[]`
  - `byMostRecent(players): Player[]`
  - `scoreboardRows(players, subject): ScoreRow[]`
  - `rankOf(players, id, subject): { rank: number; total: number } | null`
  - `ordinal(n: number): string`
  - `playerFromLegacyBests(best: Record<SubjectId, number>, id: string, now: number): Player | null`
  - `type ParsedPlayers = { ok: true; players: Player[] } | { ok: false }`
  - `parsePlayers(raw: string): ParsedPlayers`
  - `serializePlayers(players): string`

- [ ] **Step 1: Write the failing test**

Create `__tests__/game/players-test.ts`:

```ts
import {
  addPlayer,
  bestsFrom,
  byMostRecent,
  cleanName,
  MAX_NAME_LENGTH,
  nameError,
  ordinal,
  parsePlayers,
  playerFromLegacyBests,
  rankOf,
  recordGame,
  renamePlayer,
  scoreboardRows,
  serializePlayers,
  type Player,
} from '../../src/game/players';

function player(id: string, name: string, best: Partial<Player['best']> = {}, lastPlayedAt = 0): Player {
  return { id, name, best: bestsFrom(best), lastPlayedAt };
}

describe('cleanName', () => {
  it('trims both ends and collapses runs of spaces inside', () => {
    expect(cleanName('  Maya  ')).toBe('Maya');
    expect(cleanName('Anna   Maria')).toBe('Anna Maria');
    expect(cleanName(' \t ')).toBe('');
  });
});

describe('nameError', () => {
  const players = [player('p-1', 'Maya'), player('p-2', 'Leo')];

  it('refuses an empty name, including one of only spaces', () => {
    expect(nameError('', players)).toBe('empty');
    expect(nameError('   ', players)).toBe('empty');
  });

  it(`allows ${MAX_NAME_LENGTH} characters and refuses more`, () => {
    expect(nameError('A'.repeat(12), players)).toBeNull();
    expect(nameError('A'.repeat(13), players)).toBe('too-long');
    // Spaces trimmed away do not count.
    expect(nameError(`  ${'A'.repeat(12)}  `, players)).toBeNull();
  });

  it('refuses a taken name, ignoring capitals and extra spaces', () => {
    expect(nameError('maya', players)).toBe('taken');
    expect(nameError('  LEO ', players)).toBe('taken');
    expect(nameError('Sam', players)).toBeNull();
  });

  it('lets a player keep their own name when renaming, even with different capitals', () => {
    expect(nameError('MAYA', players, 'p-1')).toBeNull();
    expect(nameError('Leo', players, 'p-1')).toBe('taken');
  });
});

describe('addPlayer', () => {
  it('adds a player with the cleaned name, zero bests and the given id and time', () => {
    const added = addPlayer([player('p-1', 'Maya')], '  Leo ', 'p-2', 500);
    expect(added).toHaveLength(2);
    expect(added[1]).toEqual({
      id: 'p-2',
      name: 'Leo',
      best: { math: 0, english: 0, science: 0, geography: 0 },
      lastPlayedAt: 500,
    });
  });
});

describe('renamePlayer', () => {
  it('changes only the name, keeping the id, bests and last-played time', () => {
    const before = [player('p-1', 'Player 1', { math: 30 }, 100), player('p-2', 'Leo')];
    const after = renamePlayer(before, 'p-1', ' Maya ');
    expect(after[0]).toEqual({ ...before[0], name: 'Maya' });
    expect(after[1]).toEqual(before[1]);
  });
});

describe('recordGame', () => {
  const before = [player('p-1', 'Maya', { math: 30, geography: 42 }, 100), player('p-2', 'Leo', { math: 5 }, 200)];

  it('raises the best in that subject only when the score is higher', () => {
    expect(recordGame(before, 'p-1', 'math', 35, 900)[0].best).toEqual({ math: 35, english: 0, science: 0, geography: 42 });
    expect(recordGame(before, 'p-1', 'math', 12, 900)[0].best.math).toBe(30);
  });

  it('updates the last-played time even for a score of 0, and leaves other players alone', () => {
    const after = recordGame(before, 'p-1', 'english', 0, 900);
    expect(after[0].lastPlayedAt).toBe(900);
    expect(after[0].best).toEqual(before[0].best);
    expect(after[1]).toEqual(before[1]);
  });

  it('changes nothing for an unknown id', () => {
    expect(recordGame(before, 'p-9', 'math', 99, 900)).toEqual(before);
  });
});

describe('byMostRecent', () => {
  it('puts the most recently played first and keeps saved order for equal times', () => {
    const players = [player('a', 'A', {}, 100), player('b', 'B', {}, 300), player('c', 'C', {}, 100), player('d', 'D', {}, 200)];
    expect(byMostRecent(players).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('scoreboardRows', () => {
  const players = [
    player('p-1', 'maya', { geography: 35 }),
    player('p-2', 'Leo', { geography: 42 }),
    player('p-3', 'Ava', { geography: 35 }),
    player('p-4', 'Sam', { geography: 10 }),
    player('p-5', 'Zed', { geography: 0, math: 50 }),
  ];

  it('ranks by best, highest first, with shared ranks that skip and ties ordered by name', () => {
    expect(scoreboardRows(players, 'geography').map((row) => [row.rank, row.player.name, row.best])).toEqual([
      [1, 'Leo', 42],
      [2, 'Ava', 35],
      [2, 'maya', 35],
      [4, 'Sam', 10],
    ]);
  });

  it('leaves out players with no points in the subject', () => {
    expect(scoreboardRows(players, 'math').map((row) => row.player.id)).toEqual(['p-5']);
    expect(scoreboardRows(players, 'science')).toEqual([]);
  });
});

describe('rankOf', () => {
  const players = [
    player('p-1', 'Maya', { geography: 35 }),
    player('p-2', 'Leo', { geography: 42 }),
    player('p-3', 'Ava', { geography: 35 }),
    player('p-4', 'Sam'),
  ];

  it('gives the shared rank and the number of ranked players', () => {
    expect(rankOf(players, 'p-1', 'geography')).toEqual({ rank: 2, total: 3 });
    expect(rankOf(players, 'p-2', 'geography')).toEqual({ rank: 1, total: 3 });
  });

  it('is null for a player with no points in the subject, or an unknown id', () => {
    expect(rankOf(players, 'p-4', 'geography')).toBeNull();
    expect(rankOf(players, 'p-9', 'geography')).toBeNull();
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [101, '101st'],
    [111, '111th'],
  ])('%i is %s', (n, word) => {
    expect(ordinal(n)).toBe(word);
  });
});

describe('playerFromLegacyBests', () => {
  it('makes "Player 1" from the old bests when any is above 0', () => {
    const best = bestsFrom({ math: 30, geography: 12 });
    expect(playerFromLegacyBests(best, 'p-1', 700)).toEqual({ id: 'p-1', name: 'Player 1', best, lastPlayedAt: 700 });
  });

  it('makes no player when every old best is 0', () => {
    expect(playerFromLegacyBests(bestsFrom({}), 'p-1', 700)).toBeNull();
  });
});

describe('bestsFrom', () => {
  it('keeps whole numbers of 0 or more and turns anything else into 0', () => {
    expect(bestsFrom({ math: 7, english: -3, science: 2.5, geography: '9', extra: 4 })).toEqual({
      math: 7,
      english: 0,
      science: 0,
      geography: 0,
    });
  });
});

describe('parsePlayers and serializePlayers', () => {
  it('round-trips saved players', () => {
    const players = [player('p-1', 'Maya', { math: 30 }, 100), player('p-2', 'Leo', { geography: 4 }, 200)];
    expect(parsePlayers(serializePlayers(players))).toEqual({ ok: true, players });
  });

  it('skips malformed entries and keeps the first entry for a repeated id', () => {
    const raw = JSON.stringify({
      version: 1,
      players: [
        { id: 'p-1', name: 'Maya', best: { math: 3 }, lastPlayedAt: 100 },
        { id: '', name: 'No id' },
        { id: 'p-2', name: '   ' },
        { id: 'p-3', name: 'A'.repeat(13) },
        { id: 'p-4', name: 42 },
        'not a player',
        { id: 'p-1', name: 'Copy', best: { math: 99 }, lastPlayedAt: 900 },
      ],
    });
    const parsed = parsePlayers(raw);
    expect(parsed).toEqual({ ok: true, players: [player('p-1', 'Maya', { math: 3 }, 100)] });
  });

  it('turns missing or invalid bests and times into 0, and cleans names', () => {
    const raw = JSON.stringify({ version: 1, players: [{ id: 'p-1', name: '  Maya  ', best: { math: 'lots', english: 4 } }] });
    expect(parsePlayers(raw)).toEqual({ ok: true, players: [player('p-1', 'Maya', { english: 4 }, 0)] });
  });

  it.each([
    ['text that is not JSON', 'not json {'],
    ['a list instead of an object', '[]'],
    ['an unknown version', JSON.stringify({ version: 2, players: [] })],
    ['a missing players list', JSON.stringify({ version: 1 })],
  ])('reports %s as unreadable', (_what, raw) => {
    expect(parsePlayers(raw)).toEqual({ ok: false });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- __tests__/game/players-test.ts`
Expected: FAIL. The suite cannot run: `Cannot find module '../../src/game/players'`.

- [ ] **Step 3: Write the player logic**

Create `src/game/players.ts`:

```ts
import { SUBJECT_IDS, type SubjectId } from './subjects';

export const MAX_NAME_LENGTH = 12;
export const LEGACY_PLAYER_NAME = 'Player 1';
const STORAGE_VERSION = 1;

export interface Player {
  // Made once when the player is created; never shown and never changed, so a rename keeps the scores.
  id: string;
  name: string;
  best: Record<SubjectId, number>;
  // Milliseconds since 1970: when the player was created or last had a game recorded.
  lastPlayedAt: number;
}

export type NameError = 'empty' | 'too-long' | 'taken';

export interface ScoreRow {
  rank: number;
  player: Player;
  best: number;
}

// Trims both ends and turns each run of spaces inside the name into one space.
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

// Why a name can't be used, or null when it can. Pass the player's own id when renaming, so they may
// keep their own name (even with different capitals).
export function nameError(raw: string, players: readonly Player[], renamingId?: string): NameError | null {
  const name = cleanName(raw);
  if (name.length === 0) return 'empty';
  if (name.length > MAX_NAME_LENGTH) return 'too-long';
  const lower = name.toLowerCase();
  const taken = players.some((player) => player.id !== renamingId && player.name.toLowerCase() === lower);
  return taken ? 'taken' : null;
}

// One whole-number best per subject; anything missing or invalid counts as 0.
export function bestsFrom(source: Readonly<Record<string, unknown>>): Record<SubjectId, number> {
  const best = {} as Record<SubjectId, number>;
  for (const subject of SUBJECT_IDS) {
    const value = source[subject];
    best[subject] = typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
  }
  return best;
}

// The caller checks nameError first. A new player counts as just played, so they sort first.
export function addPlayer(players: readonly Player[], raw: string, id: string, now: number): Player[] {
  return [...players, { id, name: cleanName(raw), best: bestsFrom({}), lastPlayedAt: now }];
}

// The caller checks nameError first. Only the name changes.
export function renamePlayer(players: readonly Player[], id: string, raw: string): Player[] {
  return players.map((player) => (player.id === id ? { ...player, name: cleanName(raw) } : player));
}

// A game's score raises the player's best in that subject when it is higher. Either way they have just played.
export function recordGame(
  players: readonly Player[],
  id: string,
  subject: SubjectId,
  score: number,
  now: number,
): Player[] {
  return players.map((player) =>
    player.id === id
      ? { ...player, best: { ...player.best, [subject]: Math.max(player.best[subject], score) }, lastPlayedAt: now }
      : player,
  );
}

// "Who's playing?" order: the most recently played first; equal times keep their saved order.
export function byMostRecent(players: readonly Player[]): Player[] {
  return [...players].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

function compareNames(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

// A subject's scoreboard: players with at least 1 point there, highest best first. Equal bests share a
// rank and the next rank skips (1, 2, 2, 4); tied players are ordered by name, ignoring capitals.
export function scoreboardRows(players: readonly Player[], subject: SubjectId): ScoreRow[] {
  const ranked = players
    .filter((player) => player.best[subject] > 0)
    .sort((a, b) => b.best[subject] - a.best[subject] || compareNames(a.name, b.name));
  const rows: ScoreRow[] = [];
  ranked.forEach((player, index) => {
    const best = player.best[subject];
    const previous = rows[index - 1];
    rows.push({ rank: previous !== undefined && previous.best === best ? previous.rank : index + 1, player, best });
  });
  return rows;
}

// The player's place on a subject's scoreboard and how many players are on it; null with no points there.
export function rankOf(
  players: readonly Player[],
  id: string,
  subject: SubjectId,
): { rank: number; total: number } | null {
  const rows = scoreboardRows(players, subject);
  const row = rows.find((candidate) => candidate.player.id === id);
  return row ? { rank: row.rank, total: rows.length } : null;
}

// 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st, 22nd ... 101st, 111th.
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

// Bests saved before player names existed become "Player 1", unless every one of them is 0.
export function playerFromLegacyBests(best: Record<SubjectId, number>, id: string, now: number): Player | null {
  if (!SUBJECT_IDS.some((subject) => best[subject] > 0)) return null;
  return { id, name: LEGACY_PLAYER_NAME, best: { ...best }, lastPlayedAt: now };
}

export type ParsedPlayers = { ok: true; players: Player[] } | { ok: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPlayer(entry: unknown): Player | null {
  if (!isRecord(entry)) return null;
  const { id, name, best, lastPlayedAt } = entry;
  if (typeof id !== 'string' || id.length === 0 || typeof name !== 'string') return null;
  const clean = cleanName(name);
  if (clean.length === 0 || clean.length > MAX_NAME_LENGTH) return null;
  return {
    id,
    name: clean,
    best: bestsFrom(isRecord(best) ? best : {}),
    lastPlayedAt: typeof lastPlayedAt === 'number' && Number.isFinite(lastPlayedAt) ? lastPlayedAt : 0,
  };
}

// Reads saved players defensively: bad entries are skipped and a repeated id keeps its first entry.
// { ok: false } means the text as a whole is unreadable (not JSON, or not version 1 with a players list).
export function parsePlayers(raw: string): ParsedPlayers {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (!isRecord(data) || data.version !== STORAGE_VERSION || !Array.isArray(data.players)) return { ok: false };
  const players: Player[] = [];
  for (const entry of data.players) {
    const player = toPlayer(entry);
    if (player && !players.some((existing) => existing.id === player.id)) players.push(player);
  }
  return { ok: true, players };
}

export function serializePlayers(players: readonly Player[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, players });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- __tests__/game/players-test.ts`
Expected: PASS, 36 tests.

- [ ] **Step 5: Run everything, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
```

Expected:
- `npm test`: PASS, 763 tests.
- `tsc` and lint: no errors and no warnings.

- [ ] **Step 6: Commit**

```bash
git add src/game/players.ts __tests__/game/players-test.ts
git commit -m "feat(game): add player logic for names, bests and rankings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Saving and loading players

**Files:**
- Create: `src/hooks/players-storage.ts`
- Modify: `src/hooks/best-score-keys.ts:3` (comment only)
- Test: `__tests__/hooks/players-storage-test.ts`

**Interfaces:**
- Consumes:
  - From `src/game/players.ts` (Task 1): `bestsFrom`, `parsePlayers`, `playerFromLegacyBests`, `serializePlayers`, `type Player`.
  - From `src/hooks/best-score-keys.ts` (unchanged values): `BEST_SCORE_KEYS: Record<SubjectId, string>`.
- Produces (in `src/hooks/players-storage.ts`):
  - `PLAYERS_KEY = 'quiz-shooter:players'`, `DAMAGED_PLAYERS_KEY = 'quiz-shooter:players:damaged'`
  - `interface KeyValueStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }`
  - `interface LoadedPlayers { players: Player[]; canSave: boolean }`
  - `loadPlayers(storage: KeyValueStorage, newId: () => string, now: number): Promise<LoadedPlayers>`, which never throws
  - `savePlayers(storage: KeyValueStorage, players: readonly Player[]): Promise<void>`, which never throws

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/players-storage-test.ts`:

```ts
import { bestsFrom, serializePlayers, type Player } from '../../src/game/players';
import { BEST_SCORE_KEYS } from '../../src/hooks/best-score-keys';
import {
  DAMAGED_PLAYERS_KEY,
  loadPlayers,
  PLAYERS_KEY,
  savePlayers,
  type KeyValueStorage,
} from '../../src/hooks/players-storage';

// An in-memory stand-in for AsyncStorage. `failGet` / `failSet` make those calls reject for the listed keys.
function fakeStorage(initial: Record<string, string> = {}, failGet: string[] = [], failSet: string[] = []) {
  const data = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: async (key) => {
      if (failGet.includes(key)) throw new Error(`read ${key} failed`);
      return data.get(key) ?? null;
    },
    setItem: async (key, value) => {
      if (failSet.includes(key)) throw new Error(`write ${key} failed`);
      data.set(key, value);
    },
  };
  return { storage, data };
}

const newId = () => 'p-new';

function player(id: string, name: string, best: Partial<Player['best']> = {}, lastPlayedAt = 0): Player {
  return { id, name, best: bestsFrom(best), lastPlayedAt };
}

describe('loadPlayers', () => {
  it('turns old bests into "Player 1" on the first load and saves the new key', async () => {
    const { storage, data } = fakeStorage({
      [BEST_SCORE_KEYS.math]: '30',
      [BEST_SCORE_KEYS.geography]: '12',
    });
    const loaded = await loadPlayers(storage, newId, 700);
    const expected = [player('p-new', 'Player 1', { math: 30, geography: 12 }, 700)];
    expect(loaded).toEqual({ players: expected, canSave: true });
    expect(data.get(PLAYERS_KEY)).toBe(serializePlayers(expected));
    // The old keys are never changed.
    expect(data.get(BEST_SCORE_KEYS.math)).toBe('30');
  });

  it('saves an empty list and makes no "Player 1" when there are no old bests', async () => {
    const { storage, data } = fakeStorage({ [BEST_SCORE_KEYS.english]: '0' });
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: [], canSave: true });
    expect(data.get(PLAYERS_KEY)).toBe(serializePlayers([]));
  });

  it('treats unreadable old bests as 0', async () => {
    const { storage } = fakeStorage({ [BEST_SCORE_KEYS.math]: 'lots', [BEST_SCORE_KEYS.science]: '5' }, [
      BEST_SCORE_KEYS.english,
    ]);
    const loaded = await loadPlayers(storage, newId, 700);
    expect(loaded.players).toEqual([player('p-new', 'Player 1', { science: 5 }, 700)]);
  });

  it('ignores the old bests once saved players exist', async () => {
    const saved = [player('p-1', 'Maya', { math: 3 }, 100)];
    const { storage } = fakeStorage({ [PLAYERS_KEY]: serializePlayers(saved), [BEST_SCORE_KEYS.math]: '30' });
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: saved, canSave: true });
  });

  it('copies unreadable saved players aside, then starts with an empty list', async () => {
    const { storage, data } = fakeStorage({ [PLAYERS_KEY]: 'not json {' });
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: [], canSave: true });
    expect(data.get(DAMAGED_PLAYERS_KEY)).toBe('not json {');
    // Nothing has been saved over the unreadable copy yet.
    expect(data.get(PLAYERS_KEY)).toBe('not json {');
  });

  it('turns saving off when unreadable saved players cannot be copied aside', async () => {
    const { storage } = fakeStorage({ [PLAYERS_KEY]: 'not json {' }, [], [DAMAGED_PLAYERS_KEY]);
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: [], canSave: false });
  });

  it('turns saving off, without throwing, when the saved players cannot be read', async () => {
    const { storage } = fakeStorage({}, [PLAYERS_KEY]);
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: [], canSave: false });
  });

  it('does not throw when saving the first list fails', async () => {
    const { storage } = fakeStorage({ [BEST_SCORE_KEYS.math]: '30' }, [], [PLAYERS_KEY]);
    const loaded = await loadPlayers(storage, newId, 700);
    expect(loaded.players).toHaveLength(1);
  });
});

describe('savePlayers', () => {
  it('writes the players under the players key', async () => {
    const { storage, data } = fakeStorage();
    const players = [player('p-1', 'Maya', { math: 3 }, 100)];
    await savePlayers(storage, players);
    expect(data.get(PLAYERS_KEY)).toBe(serializePlayers(players));
  });

  it('does not throw when the write fails', async () => {
    const { storage } = fakeStorage({}, [], [PLAYERS_KEY]);
    await expect(savePlayers(storage, [])).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- __tests__/hooks/players-storage-test.ts`
Expected: FAIL. The suite cannot run: `Cannot find module '../../src/hooks/players-storage'`.

- [ ] **Step 3: Write the storage module**

Create `src/hooks/players-storage.ts`:

```ts
// Relative imports (not "@/…"): the unit tests import this file, and they only resolve relative paths.
import { bestsFrom, parsePlayers, playerFromLegacyBests, serializePlayers, type Player } from '../game/players';
import { SUBJECT_IDS } from '../game/subjects';
import { BEST_SCORE_KEYS } from './best-score-keys';

export const PLAYERS_KEY = 'quiz-shooter:players';
// Unreadable saved players are copied here before anything can be saved over them.
export const DAMAGED_PLAYERS_KEY = 'quiz-shooter:players:damaged';

// The part of AsyncStorage this file uses, so tests can pass an in-memory fake.
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LoadedPlayers {
  players: Player[];
  // False when the saved players could not be read, or could not be copied aside: then nothing may be
  // saved over them for the rest of the session.
  canSave: boolean;
}

// Never throws. The first load (no saved players yet) turns the old per-subject bests into "Player 1".
export async function loadPlayers(storage: KeyValueStorage, newId: () => string, now: number): Promise<LoadedPlayers> {
  let raw: string | null;
  try {
    raw = await storage.getItem(PLAYERS_KEY);
  } catch {
    return { players: [], canSave: false };
  }

  if (raw === null) {
    const players = await playersFromLegacyBests(storage, newId, now);
    await savePlayers(storage, players);
    return { players, canSave: true };
  }

  const parsed = parsePlayers(raw);
  if (parsed.ok) return { players: parsed.players, canSave: true };
  try {
    await storage.setItem(DAMAGED_PLAYERS_KEY, raw);
    return { players: [], canSave: true };
  } catch {
    return { players: [], canSave: false };
  }
}

async function playersFromLegacyBests(storage: KeyValueStorage, newId: () => string, now: number): Promise<Player[]> {
  const saved = await Promise.all(
    SUBJECT_IDS.map((subject) => storage.getItem(BEST_SCORE_KEYS[subject]).catch(() => null)),
  );
  const best = bestsFrom(Object.fromEntries(SUBJECT_IDS.map((subject, i) => [subject, Number(saved[i])])));
  const player = playerFromLegacyBests(best, newId(), now);
  return player ? [player] : [];
}

// Never throws: a failed write leaves the saved copy as it was, and the game keeps the players in memory.
export async function savePlayers(storage: KeyValueStorage, players: readonly Player[]): Promise<void> {
  try {
    await storage.setItem(PLAYERS_KEY, serializePlayers(players));
  } catch {
    // Ignored on purpose.
  }
}
```

- [ ] **Step 4: Update the old keys' comment**

In `src/hooks/best-score-keys.ts`, replace:

```ts
// Math keeps the original key so bests saved before English existed carry over.
```

with:

```ts
// Where each subject's best was saved before player names existed. They are read once, to create
// "Player 1" (see players-storage.ts), and never written again. Do not change them.
```

Do not change the keys themselves.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- __tests__/hooks/players-storage-test.ts __tests__/hooks/best-score-keys-test.ts`
Expected: PASS, 14 tests (10 new and the 4 existing key tests).

- [ ] **Step 6: Run everything, typecheck and lint**

```bash
npm test
npx tsc --noEmit
npx expo lint
```

Expected:
- `npm test`: PASS, 773 tests.
- `tsc` and lint: no errors and no warnings.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/players-storage.ts src/hooks/best-score-keys.ts __tests__/hooks/players-storage-test.ts
git commit -m "feat: save players on the phone and move old bests to Player 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Players in the menu

After this task the app asks "Who's playing?" before the subject picker, and every game is credited to the chosen player. There are no Scoreboard buttons yet; Task 4 adds them with the Scoreboard screen.

These files are UI and React state; the project has no component-rendering test library and allows no new packages. So this task adds no unit tests. Instead it checks that the full suite stays green, the typecheck and linter pass, and a static web export renders the menu. The tested logic from Tasks 1–2 does the real work.

**Review note:** trace Review Focus item 1 through `game-screen.tsx`. Game Over records once. Pause → Menu records. Game Over → Menu does not record again. Play again keeps the player. Menu and Change clear it.

**Files:**
- Create: `src/components/game/menu-parts.tsx`
- Create: `src/hooks/players-store.tsx`
- Create: `src/components/game/name-form.tsx`
- Create: `src/components/game/player-panel.tsx`
- Modify: `src/app/_layout.tsx`
- Modify: `src/components/game/overlay.tsx` (whole file)
- Modify: `src/components/game/game-screen.tsx` (whole file)
- Delete: `src/hooks/use-best-scores.ts`

**Interfaces:**
- Consumes:
  - From Task 1: `addPlayer`, `nameError`, `recordGame`, `renamePlayer`, `byMostRecent`, `rankOf`, `ordinal`, `MAX_NAME_LENGTH`, `type NameError`, `type Player`.
  - From Task 2: `loadPlayers`, `savePlayers`.
- Produces:
  - `src/components/game/menu-parts.tsx`: `PrimaryButton({ label, onPress })`, `SecondaryButton({ label, onPress })` and `menuStyles`, which has `title`, `subtitle`, `grid`, `tile`, `tileName`, `button`, `buttonLabel`, `secondaryButton`, `secondaryLabel` and `pressed`.
  - `src/hooks/players-store.tsx`: `PlayersProvider({ children })` and `usePlayers()`, which returns:
    - `loaded: boolean`
    - `players: Player[]`
    - `createPlayer(name: string): { id: string } | { error: NameError }`
    - `renamePlayer(id: string, name: string): NameError | null`
    - `recordGame(id: string, subject: SubjectId, score: number): void`
  - `src/components/game/name-form.tsx`: `NameForm({ title, initialName, onSave, onCancel })`, where `onSave: (name: string) => NameError | null`.
  - `src/components/game/player-panel.tsx`: `PlayerPanel({ onChoose })`, where `onChoose: (playerId: string) => void`. Task 4 adds `onScoreboard`.
  - `Overlay` props in this task: `phase`, `subject`, `score`, `player: Player | null`, `isNewBest`, `rank: { rank: number; total: number } | null`, `onChoosePlayer`, `onChangePlayer`, `onStart`, `onResume` and `onMenu`. Task 4 adds `onScoreboard`.

- [ ] **Step 1: Move the shared menu buttons and styles into their own file**

Create `src/components/game/menu-parts.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import { GameColors } from './colors';

// Buttons and styles shared by the menu panels (subject picker, "Who's playing?", name form, pause and
// game over) and the Scoreboard screen, so they all look the same.

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [menuStyles.button, pressed && menuStyles.pressed]}>
      <Text style={menuStyles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [menuStyles.secondaryButton, pressed && menuStyles.pressed]}>
      <Text style={menuStyles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export const menuStyles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '900', color: GameColors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: GameColors.textDim, textAlign: 'center', marginBottom: 4 },
  // Tiles wrap two per row, like the answer pad.
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
  },
  // The name fills the tile's width, so a long name ("Mathematics") shrinks to fit instead of wrapping.
  tileName: { alignSelf: 'stretch', textAlign: 'center', fontSize: 18, fontWeight: '800', color: GameColors.text },
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

- [ ] **Step 2: Add the players store**

Create `src/hooks/players-store.tsx`:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  addPlayer,
  nameError,
  recordGame as withGame,
  renamePlayer as withName,
  type NameError,
  type Player,
} from '@/game/players';
import type { SubjectId } from '@/game/subjects';

import { loadPlayers, savePlayers } from './players-storage';

interface PlayersValue {
  // False until the saved players have loaded; nothing can be created before then.
  loaded: boolean;
  players: Player[];
  // The new player's id, or why the name was refused.
  createPlayer(name: string): { id: string } | { error: NameError };
  // Null when renamed, or why the name was refused.
  renamePlayer(id: string, name: string): NameError | null;
  recordGame(id: string, subject: SubjectId, score: number): void;
}

const PlayersContext = createContext<PlayersValue | null>(null);

function newPlayerId(): string {
  return `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// The app's one shared copy of the players, saved to the phone after every change.
export function PlayersProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  // The latest list and whether saving is allowed, for the change functions below to read without
  // waiting for a re-render.
  const latest = useRef<Player[]>([]);
  const canSave = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadPlayers(AsyncStorage, newPlayerId, Date.now()).then((result) => {
      if (cancelled) return;
      latest.current = result.players;
      canSave.current = result.canSave;
      setPlayers(result.players);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: Player[]) => {
    latest.current = next;
    setPlayers(next);
    if (canSave.current) void savePlayers(AsyncStorage, next);
  }, []);

  const createPlayer = useCallback(
    (name: string) => {
      const error = nameError(name, latest.current);
      if (error) return { error };
      const id = newPlayerId();
      commit(addPlayer(latest.current, name, id, Date.now()));
      return { id };
    },
    [commit],
  );

  const renamePlayer = useCallback(
    (id: string, name: string) => {
      const error = nameError(name, latest.current, id);
      if (error) return error;
      commit(withName(latest.current, id, name));
      return null;
    },
    [commit],
  );

  const recordGame = useCallback(
    (id: string, subject: SubjectId, score: number) => {
      commit(withGame(latest.current, id, subject, score, Date.now()));
    },
    [commit],
  );

  const value = useMemo(
    () => ({ loaded, players, createPlayer, renamePlayer, recordGame }),
    [loaded, players, createPlayer, renamePlayer, recordGame],
  );
  return <PlayersContext value={value}>{children}</PlayersContext>;
}

export function usePlayers(): PlayersValue {
  const value = use(PlayersContext);
  if (!value) throw new Error('usePlayers must be used inside PlayersProvider');
  return value;
}
```

Replace the whole of `src/app/_layout.tsx` with:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GameColors } from '@/components/game/colors';
import { PlayersProvider } from '@/hooks/players-store';

export default function RootLayout() {
  return (
    // One shared copy of the players for the game screen and the Scoreboard screen.
    <PlayersProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: GameColors.background } }}
      />
    </PlayersProvider>
  );
}
```

- [ ] **Step 3: Add the name form**

Create `src/components/game/name-form.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { MAX_NAME_LENGTH, type NameError } from '@/game/players';

import { GameColors } from './colors';
import { menuStyles, PrimaryButton, SecondaryButton } from './menu-parts';

const MESSAGES: Record<NameError, string> = {
  empty: 'Type a name.',
  'too-long': `Use ${MAX_NAME_LENGTH} characters or fewer.`,
  taken: 'That name is taken.',
};

interface NameFormProps {
  title: string;
  initialName: string;
  // Saves the name and returns null, or returns why it was refused.
  onSave: (name: string) => NameError | null;
  onCancel: () => void;
}

// Creates or renames a player. It sits in the menu panel, which keeps it above the on-screen keyboard.
export function NameForm({ title, initialName, onSave, onCancel }: NameFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<NameError | null>(null);

  const save = () => setError(onSave(name));

  return (
    <>
      <Text style={menuStyles.title} maxFontSizeMultiplier={1.4} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        onSubmitEditing={save}
        placeholder="Name"
        placeholderTextColor={GameColors.textDim}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        maxFontSizeMultiplier={1.4}
        accessibilityLabel="Player name"
      />
      {error && (
        <Text style={styles.error} maxFontSizeMultiplier={1.4} accessibilityLiveRegion="polite">
          {MESSAGES[error]}
        </Text>
      )}
      <PrimaryButton label="Save" onPress={save} />
      <SecondaryButton label="Cancel" onPress={onCancel} />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    alignSelf: 'stretch',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
    color: GameColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  error: { fontSize: 15, fontWeight: '700', color: GameColors.danger, textAlign: 'center' },
});
```

- [ ] **Step 4: Add the "Who's playing?" panel**

Create `src/components/game/player-panel.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { byMostRecent, type Player } from '@/game/players';
import { usePlayers } from '@/hooks/players-store';

import { GameColors } from './colors';
import { menuStyles, SecondaryButton } from './menu-parts';
import { NameForm } from './name-form';

interface PlayerPanelProps {
  onChoose: (playerId: string) => void;
}

type Form = { kind: 'new' } | { kind: 'rename'; player: Player };

// "Who's playing?": pick a saved player, add a new one, or rename one in edit mode.
export function PlayerPanel({ onChoose }: PlayerPanelProps) {
  const { loaded, players, createPlayer, renamePlayer } = usePlayers();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);

  if (form?.kind === 'new') {
    return (
      <NameForm
        title="New player"
        initialName=""
        onSave={(name) => {
          const result = createPlayer(name);
          if ('error' in result) return result.error;
          setForm(null);
          onChoose(result.id);
          return null;
        }}
        onCancel={() => setForm(null)}
      />
    );
  }
  if (form?.kind === 'rename') {
    return (
      <NameForm
        title={`Rename ${form.player.name}`}
        initialName={form.player.name}
        onSave={(name) => {
          const error = renamePlayer(form.player.id, name);
          if (!error) setForm(null);
          return error;
        }}
        onCancel={() => setForm(null)}
      />
    );
  }

  return (
    <>
      <Text style={menuStyles.title} maxFontSizeMultiplier={1.4}>
        {"Who's playing?"}
      </Text>
      {loaded && (
        <>
          {editing && (
            <Text style={menuStyles.subtitle} maxFontSizeMultiplier={1.4}>
              Tap a name to rename it
            </Text>
          )}
          <ScrollView style={styles.scroll} contentContainerStyle={menuStyles.grid}>
            {byMostRecent(players).map((player) => (
              <PlayerTile
                key={player.id}
                label={player.name}
                accessibilityLabel={editing ? `Rename ${player.name}` : `Play as ${player.name}`}
                onPress={() => (editing ? setForm({ kind: 'rename', player }) : onChoose(player.id))}
              />
            ))}
            {!editing && (
              <PlayerTile
                label="+ New player"
                accessibilityLabel="New player"
                dim
                onPress={() => setForm({ kind: 'new' })}
              />
            )}
          </ScrollView>
          <View style={styles.actions}>
            {players.length > 0 && (
              <SecondaryButton label={editing ? 'Done' : 'Edit names'} onPress={() => setEditing(!editing)} />
            )}
          </View>
        </>
      )}
    </>
  );
}

interface PlayerTileProps {
  label: string;
  accessibilityLabel: string;
  // The "+ New player" tile has a quieter border than the players' tiles.
  dim?: boolean;
  onPress: () => void;
}

function PlayerTile({ label, accessibilityLabel, dim = false, onPress }: PlayerTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [menuStyles.tile, dim && styles.dimTile, pressed && menuStyles.pressed]}>
      <Text
        style={menuStyles.tileName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Shrinks and scrolls when there are more players than fit on the screen.
  scroll: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 1 },
  actions: { alignSelf: 'stretch', gap: 12 },
  dimTile: { borderColor: GameColors.buttonBorder },
});
```

- [ ] **Step 5: Show the player step in the menu and the rank at Game Over**

Replace the whole of `src/components/game/overlay.tsx` with:

```tsx
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';

import { ordinal, type Player } from '@/game/players';
import type { Phase } from '@/game/reducer';
import { SUBJECT_IDS, SUBJECTS, type SubjectId } from '@/game/subjects';

import { GameColors } from './colors';
import { menuStyles, PrimaryButton, SecondaryButton } from './menu-parts';
import { PlayerPanel } from './player-panel';

interface OverlayProps {
  phase: Phase;
  subject: SubjectId;
  score: number;
  // The chosen player; null shows "Who's playing?" on the menu.
  player: Player | null;
  isNewBest: boolean;
  // The player's place on this subject's scoreboard, shown at game over; null hides the line.
  rank: { rank: number; total: number } | null;
  onChoosePlayer: (playerId: string) => void;
  // Subject picker → Change: back to "Who's playing?".
  onChangePlayer: () => void;
  onStart: (subject: SubjectId) => void;
  onResume: () => void;
  // Pause → Menu and Game over → Menu: back to "Who's playing?".
  onMenu: () => void;
}

export function Overlay({
  phase,
  subject,
  score,
  player,
  isNewBest,
  rank,
  onChoosePlayer,
  onChangePlayer,
  onStart,
  onResume,
  onMenu,
}: OverlayProps) {
  if (phase === 'playing') return null;
  const best = player?.best[subject] ?? 0;

  return (
    // "padding" on both platforms keeps the name form above the on-screen keyboard.
    <KeyboardAvoidingView behavior="padding" style={styles.keyboard}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {phase === 'ready' && !player && <PlayerPanel onChoose={onChoosePlayer} />}
          {phase === 'ready' && player && (
            <>
              <Text style={menuStyles.title} maxFontSizeMultiplier={1.4}>
                Quiz Shooter
              </Text>
              <Text style={menuStyles.subtitle} maxFontSizeMultiplier={1.4}>
                Pick your subject
              </Text>
              <View style={styles.playingAs}>
                <Text style={styles.playingAsText} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                  Playing as {player.name} ·{' '}
                </Text>
                <Pressable onPress={onChangePlayer} accessibilityRole="button" hitSlop={12}>
                  <Text style={styles.change} maxFontSizeMultiplier={1.4}>
                    Change
                  </Text>
                </Pressable>
              </View>
              <View style={menuStyles.grid}>
                {SUBJECT_IDS.map((id) => (
                  <SubjectTile key={id} subject={id} best={player.best[id]} onPress={() => onStart(id)} />
                ))}
              </View>
            </>
          )}
          {phase === 'paused' && (
            <>
              <Text style={menuStyles.title}>Paused</Text>
              <PrimaryButton label="Resume" onPress={onResume} />
              <SecondaryButton label="Menu" onPress={onMenu} />
            </>
          )}
          {phase === 'gameover' && (
            <>
              <Text style={menuStyles.title}>Game Over</Text>
              {isNewBest && <Text style={styles.badge}>New best!</Text>}
              <Text style={styles.stat}>Score {score}</Text>
              {/* This game's score counts even before the saved best catches up with it. */}
              <Text style={styles.statDim}>Best {Math.max(best, score)}</Text>
              {rank && (
                <Text style={styles.statDim}>
                  {ordinal(rank.rank)} of {rank.total} in {SUBJECTS[subject].name}
                </Text>
              )}
              <PrimaryButton label="Play again" onPress={() => onStart(subject)} />
              <SecondaryButton label="Menu" onPress={onMenu} />
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SubjectTile({ subject, best, onPress }: { subject: SubjectId; best: number; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, best ${best}`}
      style={({ pressed }) => [menuStyles.tile, pressed && menuStyles.pressed]}>
      <Text style={styles.subjectBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <Text
        style={menuStyles.tileName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.4}>
        {name}
      </Text>
      <Text style={styles.subjectBest} maxFontSizeMultiplier={1.4}>
        Best {best}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboard: { ...StyleSheet.absoluteFill, backgroundColor: GameColors.backdrop },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: {
    width: '100%',
    maxWidth: 360,
    // Never taller than the screen: the "Who's playing?" tiles scroll instead.
    maxHeight: '100%',
    alignItems: 'center',
    gap: 12,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
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
  playingAs: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  playingAsText: { flexShrink: 1, fontSize: 15, color: GameColors.textDim },
  change: { fontSize: 15, fontWeight: '800', color: GameColors.glow },
  subjectBadge: { fontSize: 22, fontWeight: '900', color: GameColors.glow },
  subjectBest: { fontSize: 14, color: GameColors.textDim },
});
```

- [ ] **Step 6: Keep the chosen player in the game screen and credit each game to them**

Replace the whole of `src/components/game/game-screen.tsx` with:

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

import { rankOf } from '@/game/players';
import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { SUBJECTS, type SubjectId } from '@/game/subjects';
import { usePlayers } from '@/hooks/players-store';

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
  const { players, recordGame } = usePlayers();
  // Who is playing: chosen on "Who's playing?" and cleared by Menu. The reducer never sees it.
  const [playerId, setPlayerId] = useState<string | null>(null);
  const player = players.find((candidate) => candidate.id === playerId) ?? null;
  // The player's best in this subject when the run began. It can be stale if the saved players finished
  // loading after the run started, so "New best!" also requires the score to reach the live best.
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
    if (phase === 'gameover' && playerId) recordGame(playerId, subject, score);
  }, [phase, playerId, subject, score, recordGame]);

  const handleStart = useCallback(
    (next: SubjectId) => {
      setBestAtStart(player?.best[next] ?? 0);
      dispatch({ type: 'START', subject: next });
    },
    [player],
  );

  // Leaving mid-run still counts the run's score toward the player's best (a finished game is already
  // counted). Either way the menu starts again at "Who's playing?".
  const handleMenu = useCallback(() => {
    if (phase === 'paused' && playerId) recordGame(playerId, subject, score);
    dispatch({ type: 'QUIT' });
    setPlayerId(null);
  }, [phase, playerId, subject, score, recordGame]);

  const handleChangePlayer = useCallback(() => setPlayerId(null), []);

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
  const liveBest = player?.best[subject] ?? 0;

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
            card={SUBJECTS[subject].card}
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
        player={player}
        isNewBest={phase === 'gameover' && score > bestAtStart && score >= liveBest}
        rank={phase === 'gameover' && playerId ? rankOf(players, playerId, subject) : null}
        onChoosePlayer={setPlayerId}
        onChangePlayer={handleChangePlayer}
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

- [ ] **Step 7: Remove the old best-scores hook**

```bash
git rm src/hooks/use-best-scores.ts
```

- [ ] **Step 8: Run the tests, typecheck, lint and a render check**

```bash
npm test
npx tsc --noEmit
npx expo lint
git grep -nE "use-best-scores|useBestScores|BestScores" -- src __tests__
npx expo export -p web
grep -c "playing?" dist/index.html
```

Expected:
- `npm test`: PASS, 773 tests. This task adds none.
- `tsc` and lint: no errors and no warnings.
- `git grep`: prints nothing (exit code 1).
- `npx expo export -p web` ends with `Exported: dist` and lists the static routes `/ (index)`, `/_sitemap` and `/+not-found`. The export renders every route, so a render-time error fails it. `dist/` is git-ignored; leave it.
- `grep -c` prints `1` or more: the rendered menu contains "Who's playing?".

- [ ] **Step 9: Commit**

The deletion of `src/hooks/use-best-scores.ts` is already staged by Step 7's `git rm`; do not `git add` that path.

```bash
git add src/components/game/menu-parts.tsx src/hooks/players-store.tsx src/app/_layout.tsx src/components/game/name-form.tsx src/components/game/player-panel.tsx src/components/game/overlay.tsx src/components/game/game-screen.tsx
git commit -m "feat: ask who is playing and credit each game to that player

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The Scoreboard

**Files:**
- Create: `src/components/scoreboard/scoreboard-screen.tsx`
- Create: `src/app/scoreboard.tsx`
- Modify: `src/components/game/player-panel.tsx`
- Modify: `src/components/game/overlay.tsx`
- Modify: `src/components/game/game-screen.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes:
  - From Task 1: `scoreboardRows`, `type ScoreRow`.
  - From Task 3: `usePlayers()` (`loaded`, `players`), `menuStyles`, the `PlayerPanel` and `Overlay` props listed there, and the `GameScreen` state `playerId` and `subject`.
- Produces:
  - Route `/scoreboard`, with optional search params `subject` (a subject id) and `player` (a player id).
  - `ScoreboardScreen({ initialSubject: SubjectId, highlightId: string | null })`.
  - A new prop `onScoreboard: () => void` on both `PlayerPanel` and `Overlay`.

- [ ] **Step 1: Add the Scoreboard screen**

Create `src/components/scoreboard/scoreboard-screen.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameColors } from '@/components/game/colors';
import { menuStyles } from '@/components/game/menu-parts';
import { Starfield } from '@/components/game/starfield';
import { scoreboardRows, type ScoreRow } from '@/game/players';
import { SUBJECT_IDS, SUBJECTS, type SubjectId } from '@/game/subjects';
import { usePlayers } from '@/hooks/players-store';

interface ScoreboardScreenProps {
  initialSubject: SubjectId;
  // The player whose row gets the glowing border, if any.
  highlightId: string | null;
}

export function ScoreboardScreen({ initialSubject, highlightId }: ScoreboardScreenProps) {
  const { loaded, players } = usePlayers();
  const [subject, setSubject] = useState(initialSubject);
  const rows = scoreboardRows(players, subject);

  // Opened straight from a link (e.g. a web refresh), there is no screen to go back to.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && menuStyles.pressed]}>
            <Text style={styles.backLabel} maxFontSizeMultiplier={1.4}>
              ‹ Back
            </Text>
          </Pressable>
          <Text style={styles.title} maxFontSizeMultiplier={1.4}>
            Scoreboard
          </Text>
        </View>
        <View style={styles.tabs} accessibilityRole="tablist">
          {SUBJECT_IDS.map((id) => (
            <SubjectTab key={id} subject={id} selected={id === subject} onPress={() => setSubject(id)} />
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {loaded && rows.length === 0 && (
            <Text style={styles.empty} maxFontSizeMultiplier={1.4}>
              No games yet.
            </Text>
          )}
          {rows.map((row) => (
            <Row key={row.player.id} row={row} highlighted={row.player.id === highlightId} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SubjectTab({ subject, selected, onPress }: { subject: SubjectId; selected: boolean; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && menuStyles.pressed]}>
      <Text style={styles.tabBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <Text
        style={[styles.tabName, selected && styles.tabNameSelected]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.4}>
        {name}
      </Text>
    </Pressable>
  );
}

function Row({ row, highlighted }: { row: ScoreRow; highlighted: boolean }) {
  return (
    <View
      style={[styles.row, highlighted && styles.rowHighlighted]}
      accessible
      accessibilityLabel={`Rank ${row.rank}, ${row.player.name}, best ${row.best}`}>
      <Text style={styles.rank} maxFontSizeMultiplier={1.4}>
        {row.rank}
      </Text>
      <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {row.player.name}
      </Text>
      <Text style={styles.best} maxFontSizeMultiplier={1.4}>
        {row.best}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  back: { paddingVertical: 6, paddingHorizontal: 4 },
  backLabel: { fontSize: 18, fontWeight: '700', color: GameColors.glow },
  title: { flexShrink: 1, fontSize: 28, fontWeight: '900', color: GameColors.text },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
  tabSelected: { borderColor: GameColors.glow, backgroundColor: GameColors.button },
  tabBadge: { fontSize: 16, fontWeight: '900', color: GameColors.glow },
  tabName: { alignSelf: 'stretch', textAlign: 'center', fontSize: 13, fontWeight: '700', color: GameColors.textDim },
  tabNameSelected: { color: GameColors.text },
  list: { gap: 8, paddingBottom: 24 },
  empty: { marginTop: 32, fontSize: 18, color: GameColors.textDim, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
  rowHighlighted: { borderColor: GameColors.glow, backgroundColor: GameColors.button },
  rank: { minWidth: 32, fontSize: 18, fontWeight: '900', color: GameColors.glow, fontVariant: ['tabular-nums'] },
  name: { flex: 1, fontSize: 18, fontWeight: '700', color: GameColors.text },
  best: { fontSize: 20, fontWeight: '800', color: GameColors.text, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Add the route**

Create `src/app/scoreboard.tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';

import { ScoreboardScreen } from '@/components/scoreboard/scoreboard-screen';
import { SUBJECT_IDS } from '@/game/subjects';

export default function Scoreboard() {
  const { subject, player } = useLocalSearchParams<{ subject?: string; player?: string }>();
  // A missing or unknown subject opens the first tab.
  const initialSubject = SUBJECT_IDS.find((id) => id === subject) ?? SUBJECT_IDS[0];
  return <ScoreboardScreen initialSubject={initialSubject} highlightId={player ?? null} />;
}
```

- [ ] **Step 3: Regenerate the typed routes**

```bash
npx expo customize tsconfig.json
git status --short tsconfig.json
grep -c "/scoreboard" .expo/types/router.d.ts
```

Expected:
- The first command prints `Generating: tsconfig.json`.
- `git status` prints nothing: `tsconfig.json` is unchanged.
- `grep -c` prints a number above 0: the route types now include `/scoreboard`.
- `.expo/` is git-ignored, so there is nothing to commit from this step.

- [ ] **Step 4: Add the Scoreboard button to "Who's playing?"**

In `src/components/game/player-panel.tsx`, make three edits.

(a) Replace:

```tsx
interface PlayerPanelProps {
  onChoose: (playerId: string) => void;
}
```

with:

```tsx
interface PlayerPanelProps {
  onChoose: (playerId: string) => void;
  onScoreboard: () => void;
}
```

(b) Replace:

```tsx
export function PlayerPanel({ onChoose }: PlayerPanelProps) {
```

with:

```tsx
export function PlayerPanel({ onChoose, onScoreboard }: PlayerPanelProps) {
```

(c) Replace:

```tsx
          <View style={styles.actions}>
            {players.length > 0 && (
```

with:

```tsx
          <View style={styles.actions}>
            <SecondaryButton label="Scoreboard" onPress={onScoreboard} />
            {players.length > 0 && (
```

- [ ] **Step 5: Add the Scoreboard button to the menu and Game Over**

In `src/components/game/overlay.tsx`, make four edits.

(a) In `interface OverlayProps`, replace:

```tsx
  onMenu: () => void;
}
```

with:

```tsx
  onMenu: () => void;
  onScoreboard: () => void;
}
```

(b) In the `Overlay({ … })` parameter list, replace:

```tsx
  onMenu,
}: OverlayProps) {
```

with:

```tsx
  onMenu,
  onScoreboard,
}: OverlayProps) {
```

(c) Replace:

```tsx
<PlayerPanel onChoose={onChoosePlayer} />
```

with:

```tsx
<PlayerPanel onChoose={onChoosePlayer} onScoreboard={onScoreboard} />
```

(d) In the Game Over block, replace:

```tsx
              <PrimaryButton label="Play again" onPress={() => onStart(subject)} />
              <SecondaryButton label="Menu" onPress={onMenu} />
```

with:

```tsx
              <PrimaryButton label="Play again" onPress={() => onStart(subject)} />
              <SecondaryButton label="Scoreboard" onPress={onScoreboard} />
              <SecondaryButton label="Menu" onPress={onMenu} />
```

- [ ] **Step 6: Open the Scoreboard from the game screen**

In `src/components/game/game-screen.tsx`, make three edits.

(a) Replace:

```tsx
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useReducer, useState } from 'react';
```

with:

```tsx
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
```

(b) Replace:

```tsx
  const handleChangePlayer = useCallback(() => setPlayerId(null), []);
```

with:

```tsx
  const handleChangePlayer = useCallback(() => setPlayerId(null), []);

  // From game over: this subject's tab with the player highlighted. From "Who's playing?": the first tab.
  const handleScoreboard = useCallback(() => {
    router.push({ pathname: '/scoreboard', params: playerId ? { subject, player: playerId } : {} });
  }, [playerId, subject]);
```

(c) In the `<Overlay … />` props, replace:

```tsx
        onMenu={handleMenu}
      />
```

with:

```tsx
        onMenu={handleMenu}
        onScoreboard={handleScoreboard}
      />
```

- [ ] **Step 7: Describe players and the Scoreboard in the README**

In `README.md`, make four edits.

(a) Replace:

```markdown
shows its answer. Questions get harder and faster as your score climbs, and each subject's best score
is saved on the device. Built with Expo, React Native and Reanimated, for portrait phones (web works
as a bonus).
```

with:

```markdown
shows its answer. Questions get harder and faster as your score climbs. Built with Expo, React Native
and Reanimated, for portrait phones (web works as a bonus).

Before each game, pick your name on "Who's playing?" or add a new one. Each player's best score in each
subject is saved on the phone (no account or internet needed), and the Scoreboard ranks everyone,
subject by subject.
```

(b) In the "Test, lint and typecheck" section, replace:

~~~markdown
```bash
npm test
npx expo lint
npx tsc --noEmit
```
~~~

with:

~~~markdown
```bash
npm test
npx expo lint
npx expo customize tsconfig.json   # regenerates the typed route types; `npx expo start` also does
npx tsc --noEmit
```
~~~

(c) Replace:

```markdown
- `src/components/game/` - the game UI: screen, HUD, falling question, hero, answer pad, overlays.
- `src/app/` - Expo Router routes (a single game screen).
- `src/hooks/` - per-subject best-score persistence.
```

with:

```markdown
- `src/components/game/` - the game UI: screen, HUD, falling question, hero, answer pad, menus.
- `src/components/scoreboard/` - the Scoreboard screen.
- `src/app/` - Expo Router routes: the game screen and the Scoreboard.
- `src/hooks/` - the saved players: loading, saving, and the one shared copy the screens use.
```

(d) Check that no other line mentions the old per-device best: `grep -n "best score" README.md` should show only the lines written in (a).

- [ ] **Step 8: Run the tests, typecheck, lint and a render check**

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo export -p web
grep -c "Scoreboard" dist/scoreboard.html
```

Expected:
- `npm test`: PASS, 773 tests. This task adds none.
- `tsc` and lint: no errors and no warnings.
- `npx expo export -p web` ends with `Exported: dist` and lists the static routes `/ (index)`, `/_sitemap`, `/scoreboard` and `/+not-found`.
- `grep -c` prints `1` or more: the Scoreboard route renders.

- [ ] **Step 9: Commit**

```bash
git add src/components/scoreboard/scoreboard-screen.tsx src/app/scoreboard.tsx src/components/game/player-panel.tsx src/components/game/overlay.tsx src/components/game/game-screen.tsx README.md
git commit -m "feat: add the Scoreboard screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** none expected. Fix anything the checks report inside the file that owns it.

- [ ] **Step 1: Run the full check suite**

```bash
npx expo-doctor
npx expo lint
npx expo customize tsconfig.json
npx tsc --noEmit
npm test
git grep -nE "use-best-scores|useBestScores|BestScores|Change subject" -- src __tests__
```

Expected:
- Every check command exits 0, and `npm test` reports 773 tests.
- The final `git grep` prints nothing.
- `expo-doctor` needs network access. If it fails only because it can't reach the network, report that; don't change files to satisfy it.

- [ ] **Step 2: Device check (human)**

Ask the user to run `npx expo start`, open Expo Go on a phone, and check:
- **Upgrade:** on the phone that already has best scores, "Who's playing?" shows **Player 1**, and its subject tiles show the old bests. Renaming Player 1 keeps them.
- **Names:**
  - Creating a player selects them and opens the subject picker.
  - "Type a name." appears for an empty name and "That name is taken." for a taken name (try different capitals too).
  - The field stops at 12 characters.
- **Keyboard:** the name form stays fully visible above the keyboard on iOS and on Android.
- **Two players:**
  - Play one game each in the same subject.
  - Each player's tiles show only their own best.
  - "New best!" appears only when that player beats their own best.
  - The rank line reads, for example, "1st of 2 in Geography".
- **Menu paths:**
  - Play again keeps the player.
  - Game Over → Menu and Pause → Menu return to "Who's playing?".
  - A score left through Pause → Menu still counts.
  - "Change" on the subject picker returns to "Who's playing?".
- **Scoreboard:**
  - From Game Over, it opens on that subject's tab with the player's row highlighted. From "Who's playing?", it opens on Mathematics.
  - Ties share a rank, and an empty tab says "No games yet."
  - Back, the Android back button and the iOS back swipe all return to the screen you left.
- **Many players and big text:** with 8 or more players, the "Who's playing?" tiles scroll inside the panel. At the largest OS text size, the panel, the form and the Scoreboard tabs still fit.

- [ ] **Step 3: Commit any fixes**

Stage explicit paths only. Skip this commit if nothing changed.

```bash
git add <the files you changed>
git commit -m "chore: fix issues found in final verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
