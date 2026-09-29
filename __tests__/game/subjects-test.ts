import { configForLevel } from '../../src/game/difficulty';
import { englishFallMs } from '../../src/game/english';
import { ENGLISH_BANK } from '../../src/game/english-bank';
import { createRng } from '../../src/game/random';
import { SUBJECT_IDS, SUBJECTS } from '../../src/game/subjects';

describe('SUBJECTS', () => {
  it('lists math then english, each keyed by its own id', () => {
    expect(SUBJECT_IDS).toEqual(['math', 'english']);
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id].id).toBe(id);
    }
  });

  it('shows the names and badges from the spec', () => {
    expect(SUBJECTS.math).toMatchObject({ name: 'Mathematics', shortName: 'MATH', badge: '+−×÷' });
    expect(SUBJECTS.english).toMatchObject({ name: 'English', shortName: 'ENGLISH', badge: 'Aa' });
  });

  it('uses each subject own fall times', () => {
    for (const level of [1, 4, 7, 12]) {
      expect(SUBJECTS.math.fallMs(level)).toBe(configForLevel(level).fallMs);
      expect(SUBJECTS.english.fallMs(level)).toBe(englishFallMs(level));
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
});
