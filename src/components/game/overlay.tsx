import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Phase } from '@/game/reducer';
import { SUBJECT_IDS, SUBJECTS, type SubjectId } from '@/game/subjects';
import type { BestScores } from '@/hooks/use-best-scores';

import { GameColors } from './colors';

interface OverlayProps {
  phase: Phase;
  subject: SubjectId;
  score: number;
  best: BestScores;
  isNewBest: boolean;
  onStart: (subject: SubjectId) => void;
  onResume: () => void;
  // Pause → Menu and Game over → Change subject: back to the subject picker.
  onMenu: () => void;
}

export function Overlay({ phase, subject, score, best, isNewBest, onStart, onResume, onMenu }: OverlayProps) {
  if (phase === 'playing') return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        {phase === 'ready' && (
          <>
            <Text style={styles.title}>Quiz Shooter</Text>
            <Text style={styles.subtitle}>Pick your subject</Text>
            {SUBJECT_IDS.map((id) => (
              <SubjectButton key={id} subject={id} best={best[id]} onPress={() => onStart(id)} />
            ))}
          </>
        )}
        {phase === 'paused' && (
          <>
            <Text style={styles.title}>Paused</Text>
            <PrimaryButton label="Resume" onPress={onResume} />
            <SecondaryButton label="Menu" onPress={onMenu} />
          </>
        )}
        {phase === 'gameover' && (
          <>
            <Text style={styles.title}>Game Over</Text>
            {isNewBest && <Text style={styles.badge}>New best!</Text>}
            <Text style={styles.stat}>Score {score}</Text>
            <Text style={styles.statDim}>Best {best[subject]}</Text>
            <PrimaryButton label="Play again" onPress={() => onStart(subject)} />
            <SecondaryButton label="Change subject" onPress={onMenu} />
          </>
        )}
      </View>
    </View>
  );
}

function SubjectButton({ subject, best, onPress }: { subject: SubjectId; best: number; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, best ${best}`}
      style={({ pressed }) => [styles.subjectButton, pressed && styles.pressed]}>
      <Text style={styles.subjectBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <View style={styles.subjectText}>
        <Text style={styles.subjectName} maxFontSizeMultiplier={1.4}>
          {name}
        </Text>
        <Text style={styles.subjectBest} maxFontSizeMultiplier={1.4}>
          Best {best}
        </Text>
      </View>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: GameColors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
  title: { fontSize: 34, fontWeight: '900', color: GameColors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: GameColors.textDim, textAlign: 'center', marginBottom: 4 },
  badge: {
    fontSize: 14,
    fontWeight: '800',
    color: GameColors.background,
    backgroundColor: GameColors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stat: { fontSize: 22, fontWeight: '700', color: GameColors.text },
  statDim: { fontSize: 16, color: GameColors.textDim },
  subjectButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
  },
  subjectBadge: { width: 64, textAlign: 'center', fontSize: 22, fontWeight: '900', color: GameColors.glow },
  subjectText: { flex: 1 },
  subjectName: { fontSize: 22, fontWeight: '800', color: GameColors.text },
  subjectBest: { fontSize: 14, color: GameColors.textDim },
  button: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    backgroundColor: GameColors.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 20, fontWeight: '800', color: GameColors.background },
  secondaryButton: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: 18, fontWeight: '700', color: GameColors.text },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
