import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'quiz-shooter:best-score';

// Storage failures are swallowed: the game keeps working with the in-memory best.
export function useBestScore() {
  const [best, setBest] = useState(0);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const stored = Number(raw);
        if (!cancelled && Number.isFinite(stored) && stored > 0) {
          setBest((current) => Math.max(current, stored));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(
    (score: number) => {
      if (score <= best) return;
      setBest(score);
      AsyncStorage.setItem(KEY, String(score)).catch(() => {});
    },
    [best],
  );

  return { best, submit };
}
