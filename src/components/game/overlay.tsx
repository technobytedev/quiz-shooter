import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Phase } from '@/game/reducer';

import { GameColors } from './colors';

interface OverlayProps {
  phase: Phase;
  score: number;
  best: number;
  isNewBest: boolean;
  onStart: () => void;
  onResume: () => void;
}

export function Overlay({ phase, score, best, isNewBest, onStart, onResume }: OverlayProps) {
  if (phase === 'playing') return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        {phase === 'ready' && (
          <>
            <Text style={styles.title}>Quiz Shooter</Text>
            <Text style={styles.subtitle}>Shoot down the math before it lands</Text>
            <Text style={styles.stat}>Best {best}</Text>
            <PrimaryButton label="Play" onPress={onStart} />
          </>
        )}
        {phase === 'paused' && (
          <>
            <Text style={styles.title}>Paused</Text>
            <PrimaryButton label="Resume" onPress={onResume} />
          </>
        )}
        {phase === 'gameover' && (
          <>
            <Text style={styles.title}>Game Over</Text>
            {isNewBest && <Text style={styles.badge}>New best!</Text>}
            <Text style={styles.stat}>Score {score}</Text>
            <Text style={styles.statDim}>Best {best}</Text>
            <PrimaryButton label="Play again" onPress={onStart} />
          </>
        )}
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonLabel}>{label}</Text>
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
  subtitle: { fontSize: 15, color: GameColors.textDim, textAlign: 'center' },
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
  button: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    backgroundColor: GameColors.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonLabel: { fontSize: 20, fontWeight: '800', color: GameColors.background },
});
