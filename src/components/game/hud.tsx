import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STARTING_LIVES } from '@/game/reducer';
import { SUBJECTS, type SubjectId } from '@/game/subjects';

import { GameColors } from './colors';

interface HudProps {
  subject: SubjectId;
  lives: number;
  level: number;
  score: number;
  canPause: boolean;
  onPause: () => void;
}

export function Hud({ subject, lives, level, score, canPause, onPause }: HudProps) {
  return (
    <View style={styles.hud}>
      <View style={styles.side}>
        {Array.from({ length: STARTING_LIVES }, (_, i) => (
          <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]} maxFontSizeMultiplier={1.4}>
            ♥
          </Text>
        ))}
      </View>
      {/* Subject on its own small line so the longest name ("GEOGRAPHY") + level fits a 360 px-wide screen. */}
      <View style={styles.center}>
        <Text style={styles.subject} maxFontSizeMultiplier={1.2}>
          {SUBJECTS[subject].shortName}
        </Text>
        <Text style={styles.level} maxFontSizeMultiplier={1.4}>
          LV {level}
        </Text>
      </View>
      <View style={[styles.side, styles.right]}>
        <Text style={styles.score} maxFontSizeMultiplier={1.4}>
          {score}
        </Text>
        <Pressable
          onPress={onPause}
          disabled={!canPause}
          hitSlop={12}
          accessibilityLabel="Pause"
          style={[styles.pause, !canPause && styles.hidden]}>
          <Text style={styles.pauseLabel} maxFontSizeMultiplier={1.4}>
            II
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 96 },
  right: { justifyContent: 'flex-end', gap: 12 },
  center: { alignItems: 'center' },
  heart: { fontSize: 22, color: GameColors.danger },
  heartLost: { color: GameColors.buttonBorder },
  subject: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GameColors.textDim },
  level: { fontSize: 16, fontWeight: '700', letterSpacing: 2, color: GameColors.glow },
  score: {
    fontSize: 24,
    fontWeight: '800',
    color: GameColors.text,
    fontVariant: ['tabular-nums'],
  },
  pause: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GameColors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseLabel: { fontSize: 14, fontWeight: '800', color: GameColors.text },
  hidden: { opacity: 0 },
});
