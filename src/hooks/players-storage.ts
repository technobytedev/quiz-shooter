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
  // False when the saved players (or an old best being moved to "Player 1") could not be read, or could
  // not be copied aside: then nothing may be saved for the rest of the session.
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
    const { players, allRead } = await playersFromLegacyBests(storage, newId, now);
    // An old best that could not be read would be lost for good once the players key exists, so nothing
    // is saved: the move runs again on the next launch.
    if (!allRead) return { players, canSave: false };
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

async function playersFromLegacyBests(
  storage: KeyValueStorage,
  newId: () => string,
  now: number,
): Promise<{ players: Player[]; allRead: boolean }> {
  const saved = await Promise.all(
    SUBJECT_IDS.map((subject) =>
      storage.getItem(BEST_SCORE_KEYS[subject]).then(
        (value) => ({ ok: true, value }),
        () => ({ ok: false, value: null }),
      ),
    ),
  );
  const best = bestsFrom(Object.fromEntries(SUBJECT_IDS.map((subject, i) => [subject, Number(saved[i].value)])));
  const player = playerFromLegacyBests(best, newId(), now);
  return { players: player ? [player] : [], allRead: saved.every((result) => result.ok) };
}

// Never throws: a failed write leaves the saved copy as it was, and the game keeps the players in memory.
export async function savePlayers(storage: KeyValueStorage, players: readonly Player[]): Promise<void> {
  try {
    await storage.setItem(PLAYERS_KEY, serializePlayers(players));
  } catch {
    // Ignored on purpose.
  }
}
