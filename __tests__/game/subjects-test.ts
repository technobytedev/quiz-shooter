import { sentenceFallMs } from '../../src/game/bank';
import { configForLevel } from '../../src/game/difficulty';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { GEOGRAPHY_BANK } from '../../src/game/geography-bank';
import { createRng } from '../../src/game/random';
import { SCIENCE_BANK } from '../../src/game/science-bank';
import { SUBJECT_IDS, SUBJECTS } from '../../src/game/subjects';

describe('SUBJECTS', () => {
  it('lists math, english, science then geography, each keyed by its own id', () => {
    expect(SUBJECT_IDS).toEqual(['math', 'english', 'science', 'geography']);
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id].id).toBe(id);
    }
  });

  it('shows the names and badges from the spec', () => {
    expect(SUBJECTS.math).toMatchObject({ name: 'Mathematics', shortName: 'MATH', badge: '+−×÷' });
    expect(SUBJECTS.english).toMatchObject({ name: 'English', shortName: 'ENGLISH', badge: 'Aa' });
    expect(SUBJECTS.science).toMatchObject({ name: 'Science', shortName: 'SCIENCE', badge: 'H₂O' });
    expect(SUBJECTS.geography).toMatchObject({ name: 'Geography', shortName: 'GEOGRAPHY', badge: 'N↑' });
  });

  it('gives math the short card and the sentence subjects the sentence card', () => {
    expect(SUBJECTS.math.card).toBe('short');
    expect(SUBJECTS.english.card).toBe('sentence');
    expect(SUBJECTS.science.card).toBe('sentence');
    expect(SUBJECTS.geography.card).toBe('sentence');
  });

  it('uses each subject own fall times', () => {
    for (const level of [1, 4, 7, 12]) {
      expect(SUBJECTS.math.fallMs(level)).toBe(configForLevel(level).fallMs);
      expect(SUBJECTS.english.fallMs(level)).toBe(sentenceFallMs(level));
      expect(SUBJECTS.science.fallMs(level)).toBe(sentenceFallMs(level));
      expect(SUBJECTS.geography.fallMs(level)).toBe(sentenceFallMs(level));
    }
  });

  it('math makes arithmetic questions and ignores used keys', () => {
    const q = SUBJECTS.math.makeQuestion(1, createRng(1), 5, ['anything']);
    expect(q.id).toBe(5);
    expect(q.prompt).toMatch(/^\d+ \+ \d+$/);
  });

  it('english makes questions from the bank and honours used keys', () => {
    const band1 = ENGLISH_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.english.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });

  it('science makes questions from its own bank and honours used keys', () => {
    const band1 = SCIENCE_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.science.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });

  it('geography makes questions from its own bank and honours used keys', () => {
    const band1 = GEOGRAPHY_BANK.filter((i) => i.band === 1).map((i) => i.id);
    const q = SUBJECTS.geography.makeQuestion(1, createRng(1), 5, band1.slice(1));
    expect(q.key).toBe(band1[0]);
  });
});
