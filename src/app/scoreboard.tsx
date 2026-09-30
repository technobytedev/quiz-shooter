import { useLocalSearchParams } from 'expo-router';

import { ScoreboardScreen } from '@/components/scoreboard/scoreboard-screen';
import { SUBJECT_IDS } from '@/game/subjects';

export default function Scoreboard() {
  const { subject, player } = useLocalSearchParams<{ subject?: string; player?: string }>();
  // A missing or unknown subject opens the first tab.
  const initialSubject = SUBJECT_IDS.find((id) => id === subject) ?? SUBJECT_IDS[0];
  return <ScoreboardScreen initialSubject={initialSubject} highlightId={player ?? null} />;
}
