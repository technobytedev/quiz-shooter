import type { SubjectId } from '@/game/subjects';

// Math keeps the original key so bests saved before English existed carry over.
export const BEST_SCORE_KEYS: Record<SubjectId, string> = {
  math: 'quiz-shooter:best-score',
  english: 'quiz-shooter:best-score:english',
  science: 'quiz-shooter:best-score:science',
};
