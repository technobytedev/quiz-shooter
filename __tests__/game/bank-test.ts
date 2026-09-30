import { bandsForLevel, makeBankQuestion, sentenceFallMs, type BankItem } from '../../src/game/bank';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
import { createRng } from '../../src/game/random';
import { SCIENCE_BANK } from '../../src/game/science-bank';

function item(id: string, band: BankItem['band']): BankItem {
  return { id, band, sentence: `Sentence ${id} has a ___ here.`, answer: 'right', wrong: ['wrong1', 'wrong2', 'wrong3'] };
}

// Every real bank must build valid questions with the shared engine.
const BANKS: [string, readonly BankItem[]][] = [
  ['English', ENGLISH_BANK],
  ['Science', SCIENCE_BANK],
  ['Geography', GEOGRAPHY_BANK],
];

describe('bandsForLevel', () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [4, [4]],
    [5, [5]],
    [6, [4, 5]],
    [12, [4, 5]],
  ])('level %i draws from bands %j', (level, bands) => {
    expect(bandsForLevel(level)).toEqual(bands);
  });
});

describe('sentenceFallMs', () => {
  it.each([
    [1, 12000],
    [2, 11000],
    [3, 10000],
    [4, 9000],
    [5, 8500],
    [6, 8000],
    [9, 6500],
    [10, 6000],
    [11, 6000],
    [50, 6000],
  ])('level %i falls in %i ms', (level, ms) => {
    expect(sentenceFallMs(level)).toBe(ms);
  });
});

describe('makeBankQuestion', () => {
  it('does not always put the answer first', () => {
    const bank = [item('x-1-001', 1)];
    const positions = new Set(
      Array.from({ length: 50 }, (_, seed) => {
        const q = makeBankQuestion(bank, 1, createRng(seed + 1), 1, []);
        return q.choices.indexOf(q.answer);
      }),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a seed', () => {
    const bank = [item('x-1-001', 1), item('x-1-002', 1), item('x-1-003', 1)];
    expect(makeBankQuestion(bank, 1, createRng(42), 1, [])).toEqual(makeBankQuestion(bank, 1, createRng(42), 1, []));
  });

  it('avoids used items until the pool runs out, then reuses them', () => {
    const bank = [item('x-1-001', 1), item('x-1-002', 1), item('x-1-003', 1), item('x-2-001', 2)];
    const rng = createRng(7);
    const used: string[] = [];
    for (let i = 0; i < 3; i++) {
      used.push(makeBankQuestion(bank, 1, rng, i, used).key);
    }
    expect([...used].sort()).toEqual(['x-1-001', 'x-1-002', 'x-1-003']);
    // Every band-1 item has been used: the next pick reuses one instead of failing.
    expect(used).toContain(makeBankQuestion(bank, 1, rng, 3, used).key);
  });

  it('throws a clear error when a level has no items', () => {
    expect(() => makeBankQuestion([item('x-1-001', 1)], 3, createRng(1), 1, [])).toThrow('No questions for level 3');
  });
});

describe.each(BANKS)('makeBankQuestion with the %s bank', (_name, bank) => {
  it('builds a question from an item in the level band', () => {
    for (let level = 1; level <= 8; level++) {
      for (let seed = 1; seed <= 50; seed++) {
        const q = makeBankQuestion(bank, level, createRng(seed), 9, []);
        const source = bank.find((i) => i.id === q.key);
        expect(source).toBeDefined();
        expect(bandsForLevel(level)).toContain(source!.band);
        expect(q.id).toBe(9);
        expect(q.prompt).toBe(source!.sentence);
        expect(q.answer).toBe(source!.answer);
        expect([...q.choices].sort()).toEqual([source!.answer, ...source!.wrong].sort());
        expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1);
        expect(q.reveal.before + q.answer + q.reveal.after).toBe(source!.sentence.replace('___', source!.answer));
      }
    }
  });

  it('never repeats a sentence while fresh ones remain in band 1', () => {
    const rng = createRng(3);
    const used: string[] = [];
    const bandSize = bank.filter((i) => i.band === 1).length;
    for (let i = 0; i < bandSize; i++) {
      const q = makeBankQuestion(bank, 1, rng, i, used);
      expect(used).not.toContain(q.key);
      used.push(q.key);
    }
  });
});
