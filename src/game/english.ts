import { ENGLISH_BANK, type EnglishItem } from './english-bank';
import type { Question } from './question';
import { pick, shuffle, type Rng } from './random';

const BLANK = '___';
const MIN_FALL_MS = 6000;

// Bands 1-5 are used at levels 1-5; from level 6 on, the two hardest bands are pooled.
export function bandsForLevel(level: number): number[] {
  return level >= 6 ? [4, 5] : [Math.max(1, level)];
}

// Reading a sentence takes longer than arithmetic, so English falls more slowly than Math.
export function englishFallMs(level: number): number {
  if (level <= 4) return 13000 - 1000 * Math.max(1, level);
  return Math.max(MIN_FALL_MS, 9000 - 500 * (level - 4));
}

export function makeEnglishQuestion(
  level: number,
  rng: Rng,
  id: number,
  usedKeys: readonly string[],
  bank: readonly EnglishItem[] = ENGLISH_BANK,
): Question {
  const bands = bandsForLevel(level);
  const pool = bank.filter((entry) => bands.includes(entry.band));
  if (pool.length === 0) throw new Error(`No English sentences for level ${level}`);
  // No repeats within a run until the pool is used up; then any item may come back.
  const fresh = pool.filter((entry) => !usedKeys.includes(entry.id));
  const item = pick(rng, fresh.length > 0 ? fresh : pool);
  const [before, after] = item.sentence.split(BLANK);
  return {
    id,
    key: item.id,
    prompt: item.sentence,
    answer: item.answer,
    choices: shuffle(rng, [item.answer, ...item.wrong]),
    reveal: { before, after },
  };
}
