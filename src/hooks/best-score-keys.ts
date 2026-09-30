import type { SubjectId } from '@/game/subjects';

// Where each subject's best was saved before player names existed. They are read once, to create
// "Player 1" (see players-storage.ts), and never written again. Do not change them.
export const BEST_SCORE_KEYS: Record<SubjectId, string> = {
  math: 'quiz-shooter:best-score',
  english: 'quiz-shooter:best-score:english',
  science: 'quiz-shooter:best-score:science',
  geography: 'quiz-shooter:best-score:geography',
};
