import { makeBankQuestion, sentenceFallMs } from './bank';
import { configForLevel } from './difficulty';
import { ENGLISH_BANK } from './english-bank';
import { GEOGRAPHY_BANK } from './geography-bank';
import { makeMathQuestion } from './math';
import type { Question } from './question';
import type { Rng } from './random';
import { SCIENCE_BANK } from './science-bank';

export type SubjectId = 'math' | 'english' | 'science' | 'geography';

// How a subject's falling card looks: one short line (e.g. "12 × 7") or a wrapped sentence with a blank.
export type CardKind = 'short' | 'sentence';

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  badge: string;
  card: CardKind;
  fallMs(level: number): number;
  makeQuestion(level: number, rng: Rng, id: number, usedKeys: readonly string[]): Question;
}

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: 'math',
    name: 'Mathematics',
    shortName: 'MATH',
    badge: '+−×÷',
    card: 'short',
    fallMs: (level) => configForLevel(level).fallMs,
    // Math questions are generated fresh each time, so repeats are fine and usedKeys is ignored.
    makeQuestion: (level, rng, id) => makeMathQuestion(level, rng, id),
  },
  english: {
    id: 'english',
    name: 'English',
    shortName: 'ENGLISH',
    badge: 'Aa',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(ENGLISH_BANK, level, rng, id, usedKeys),
  },
  science: {
    id: 'science',
    name: 'Science',
    shortName: 'SCIENCE',
    badge: 'H₂O',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(SCIENCE_BANK, level, rng, id, usedKeys),
  },
  geography: {
    id: 'geography',
    name: 'Geography',
    shortName: 'GEOGRAPHY',
    badge: 'N↑',
    card: 'sentence',
    fallMs: sentenceFallMs,
    makeQuestion: (level, rng, id, usedKeys) => makeBankQuestion(GEOGRAPHY_BANK, level, rng, id, usedKeys),
  },
};

// Display order on the subject picker.
export const SUBJECT_IDS: readonly SubjectId[] = ['math', 'english', 'science', 'geography'];
