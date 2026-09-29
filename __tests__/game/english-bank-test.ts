import { ENGLISH_BANK } from '../../src/game/english-bank';

const BANDS = [1, 2, 3, 4, 5] as const;

describe('ENGLISH_BANK', () => {
  it('has at least 35 items in every band', () => {
    for (const band of BANDS) {
      expect(ENGLISH_BANK.filter((item) => item.band === band).length).toBeGreaterThanOrEqual(35);
    }
  });

  it('uses unique ids that match each item band', () => {
    const ids = ENGLISH_BANK.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of ENGLISH_BANK) {
      expect(item.id).toMatch(new RegExp(`^en-${item.band}-\\d{3}$`));
    }
  });

  it('has no duplicate sentences', () => {
    const sentences = ENGLISH_BANK.map((item) => item.sentence);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it.each(ENGLISH_BANK.map((item) => [item.id, item] as const))('%s follows the content rules', (_id, item) => {
    // One blank, written as exactly three underscores.
    expect(item.sentence.split('___')).toHaveLength(2);
    expect(item.sentence).not.toMatch(/____/);
    expect(item.sentence).toBe(item.sentence.trim());
    expect(item.sentence).toMatch(/[.?!]$/);

    const choices = [item.answer, ...item.wrong];
    expect(item.wrong).toHaveLength(3);
    // Distinct even ignoring case, so "Its" and "its" can never both appear.
    expect(new Set(choices.map((c) => c.toLowerCase())).size).toBe(4);
    for (const choice of choices) {
      expect(choice.length).toBeGreaterThan(0);
      expect(choice).toBe(choice.trim());
      expect(choice.split(/\s+/).length).toBeLessThanOrEqual(3);
      if (item.sentence.startsWith('___')) {
        expect(choice[0]).toBe(choice[0].toUpperCase());
      }
    }
  });
});
