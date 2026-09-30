import { makeBankQuestion, sentenceFallMs } from './bank';
import { configForLevel } from './difficulty';
import { ENGLISH_BANK } from './english-bank';
import { makeMathQuestion } from './math';
import type { Question } from './question';
import type { Rng } from './random';

export type SubjectId = 'math' | 'english';

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  badge: string;
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: 'math',
    name: 'Mathematics',
    shortName: 'MATH',
    badge: '+−×÷',
    fallMs: (level) => configForLevel(level).fallMs,
    // Math questions are generated fresh each time, so repeats are fine and usedKeys is ignored.
    makeQuestion: (level, rng, id) => makeMathQuestion(level, rng, id),
  },
  english: {
    id: 'english',
    name: 'English',
    shortName: 'ENGLISH',
    badge: 'Aa',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(ENGLISH_BANK, level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english'];
