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

  it('treats an old best that is not a number as 0', async () => {
    const { storage, data } = fakeStorage({ [BEST_SCORE_KEYS.math]: 'lots', [BEST_SCORE_KEYS.science]: '5' });
    const expected = [player('p-new', 'Player 1', { science: 5 }, 700)];
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: expected, canSave: true });
    expect(data.get(PLAYERS_KEY)).toBe(serializePlayers(expected));
  });

  it('turns saving off, and saves nothing, when an old best cannot be read', async () => {
    const { storage, data } = fakeStorage({ [BEST_SCORE_KEYS.science]: '5' }, [BEST_SCORE_KEYS.english]);
    expect(await loadPlayers(storage, newId, 700)).toEqual({
      players: [player('p-new', 'Player 1', { science: 5 }, 700)],
      canSave: false,
    });
    // The move runs again on the next launch, so the English best is not lost for good.
    expect(data.has(PLAYERS_KEY)).toBe(false);
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
    const { storage, data } = fakeStorage({ [PLAYERS_KEY]: 'not json {' }, [], [DAMAGED_PLAYERS_KEY]);
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: [], canSave: false });
    expect(data.get(PLAYERS_KEY)).toBe('not json {');
  });

  it('turns saving off, without throwing, when the saved players cannot be read', async () => {
    const { storage } = fakeStorage({}, [PLAYERS_KEY]);
    expect(await loadPlayers(storage, newId, 700)).toEqual({ players: [], canSave: false });
  });

  it('does not throw when saving the first list fails', async () => {
    const { storage } = fakeStorage({ [BEST_SCORE_KEYS.math]: '30' }, [], [PLAYERS_KEY]);
    expect(await loadPlayers(storage, newId, 700)).toEqual({
      players: [player('p-new', 'Player 1', { math: 30 }, 700)],
      canSave: true,
    });
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
