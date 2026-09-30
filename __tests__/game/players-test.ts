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
