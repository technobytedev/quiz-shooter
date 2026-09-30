import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SUBJECT_IDS, type SubjectId } from '@/game/subjects';

import { BEST_SCORE_KEYS } from './best-score-keys';

export type BestScores = Record<SubjectId, number>;

// Storage failures are swallowed: the game keeps working with the in-memory bests.
export function useBestScores() {
  const [best, setBest] = useState<BestScores>({ math: 0, english: 0, science: 0 });

  useEffect(() => {
    let cancelled = false;
    for (const subject of SUBJECT_IDS) {
      AsyncStorage.getItem(BEST_SCORE_KEYS[subject])
        .then((raw) => {
          const stored = Number(raw);
          if (!cancelled && Number.isFinite(stored) && stored > 0) {
            setBest((current) => ({ ...current, [subject]: Math.max(current[subject], stored) }));
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(
    (subject: SubjectId, score: number) => {
      if (score <= best[subject]) return;
      setBest((current) => ({ ...current, [subject]: Math.max(current[subject], score) }));
      AsyncStorage.setItem(BEST_SCORE_KEYS[subject], String(score)).catch(() => {});
    },
    [best],
  );

  return { best, submit };
}
