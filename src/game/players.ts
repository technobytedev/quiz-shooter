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
