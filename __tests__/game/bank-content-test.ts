import type { BankItem } from '../../src/game/bank';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { SCIENCE_BANK } from '../../src/game/science-bank';

const BANDS = [1, 2, 3, 4, 5] as const;
// The longest sentence (counting the "___") that stays readable on a falling card, and the
// longest choice that fits an answer button.
const MAX_SENTENCE_LENGTH = 60;
const MAX_CHOICE_LENGTH = 16;

const BANKS: [string, string, readonly BankItem[]][] = [
  ['English', 'en', ENGLISH_BANK],
  ['Science', 'sci', SCIENCE_BANK],
];

describe.each(BANKS)('%s bank', (_name, prefix, bank) => {
  it('has at least 35 items in every band', () => {
    for (const band of BANDS) {
      expect(bank.filter((item) => item.band === band).length).toBeGreaterThanOrEqual(35);
    }
  });

  it('uses unique ids that match each item band', () => {
    const ids = bank.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of bank) {
      expect(item.id).toMatch(new RegExp(`^${prefix}-${item.band}-\\d{3}$`));
    }
  });

  it('has no duplicate sentences', () => {
    const sentences = bank.map((item) => item.sentence);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it.each(bank.map((item) => [item.id, item] as const))('%s follows the content rules', (_id, item) => {
    // One blank, written as exactly three underscores.
    expect(item.sentence.split('___')).toHaveLength(2);
    expect(item.sentence).not.toMatch(/____/);
    expect(item.sentence).toBe(item.sentence.trim());
    expect(item.sentence).toMatch(/[.?!]$/);
    expect(item.sentence.length).toBeLessThanOrEqual(MAX_SENTENCE_LENGTH);

    const choices = [item.answer, ...item.wrong];
    expect(item.wrong).toHaveLength(3);
    // Distinct even ignoring case, so "Its" and "its" can never both appear.
    expect(new Set(choices.map((c) => c.toLowerCase())).size).toBe(4);
    for (const choice of choices) {
      expect(choice.length).toBeGreaterThan(0);
      expect(choice.length).toBeLessThanOrEqual(MAX_CHOICE_LENGTH);
      expect(choice).toBe(choice.trim());
      expect(choice.split(/\s+/).length).toBeLessThanOrEqual(3);
      if (item.sentence.startsWith('___')) {
        expect(choice[0]).toBe(choice[0].toUpperCase());
      }
    }
  });
});
