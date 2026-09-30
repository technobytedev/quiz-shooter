import { BEST_SCORE_KEYS } from '../../src/hooks/best-score-keys';

describe('BEST_SCORE_KEYS', () => {
  it('keeps the original Math key so saved bests carry over', () => {
    expect(BEST_SCORE_KEYS.math).toBe('quiz-shooter:best-score');
  });

  it('gives English its own key', () => {
    expect(BEST_SCORE_KEYS.english).toBe('quiz-shooter:best-score:english');
  });

  it('gives Science its own key', () => {
    expect(BEST_SCORE_KEYS.science).toBe('quiz-shooter:best-score:science');
  });

  it('gives Geography its own key', () => {
    expect(BEST_SCORE_KEYS.geography).toBe('quiz-shooter:best-score:geography');
  });
});
