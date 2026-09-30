import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';

import { ordinal, type Player } from '@/game/players';
import type { Phase } from '@/game/reducer';
import { SUBJECT_IDS, SUBJECTS, type SubjectId } from '@/game/subjects';

import { GameColors } from './colors';
import { menuStyles, PrimaryButton, SecondaryButton } from './menu-parts';
import { PlayerPanel } from './player-panel';

interface OverlayProps {
  phase: Phase;
  subject: SubjectId;
  score: number;
  // The chosen player; null shows "Who's playing?" on the menu.
  player: Player | null;
  isNewBest: boolean;
  // The player's place on this subject's scoreboard, shown at game over; null hides the line.
  rank: { rank: number; total: number } | null;
  onChoosePlayer: (playerId: string) => void;
  // Subject picker → Change: back to "Who's playing?".
  onChangePlayer: () => void;
  onStart: (subject: SubjectId) => void;
  onResume: () => void;
  // Pause → Menu and Game over → Menu: back to "Who's playing?".
  onMenu: () => void;
}

export function Overlay({
  phase,
  subject,
  score,
  player,
  isNewBest,
  rank,
  onChoosePlayer,
  onChangePlayer,
  onStart,
  onResume,
  onMenu,
}: OverlayProps) {
  if (phase === 'playing') return null;
  const best = player?.best[subject] ?? 0;

  return (
    // "padding" on both platforms keeps the name form above the on-screen keyboard.
    <KeyboardAvoidingView behavior="padding" style={styles.keyboard}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {phase === 'ready' && !player && <PlayerPanel onChoose={onChoosePlayer} />}
          {phase === 'ready' && player && (
            <>
              <Text style={menuStyles.title} maxFontSizeMultiplier={1.4}>
                Quiz Shooter
              </Text>
              <Text style={menuStyles.subtitle} maxFontSizeMultiplier={1.4}>
                Pick your subject
              </Text>
              <View style={styles.playingAs}>
                <Text style={styles.playingAsText} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                  Playing as {player.name} ·{' '}
                </Text>
                <Pressable onPress={onChangePlayer} accessibilityRole="button" hitSlop={12}>
                  <Text style={styles.change} maxFontSizeMultiplier={1.4}>
                    Change
                  </Text>
                </Pressable>
              </View>
              <View style={menuStyles.grid}>
                {SUBJECT_IDS.map((id) => (
                  <SubjectTile key={id} subject={id} best={player.best[id]} onPress={() => onStart(id)} />
                ))}
              </View>
            </>
          )}
          {phase === 'paused' && (
            <>
              <Text style={menuStyles.title}>Paused</Text>
              <PrimaryButton label="Resume" onPress={onResume} />
              <SecondaryButton label="Menu" onPress={onMenu} />
            </>
          )}
          {phase === 'gameover' && (
            <>
              <Text style={menuStyles.title}>Game Over</Text>
              {isNewBest && <Text style={styles.badge}>New best!</Text>}
              <Text style={styles.stat}>Score {score}</Text>
              {/* This game's score counts even before the saved best catches up with it. */}
              <Text style={styles.statDim}>Best {Math.max(best, score)}</Text>
              {rank && (
                <Text style={styles.statDim} maxFontSizeMultiplier={1.4}>
                  {ordinal(rank.rank)} of {rank.total} in {SUBJECTS[subject].name}
                </Text>
              )}
              <PrimaryButton label="Play again" onPress={() => onStart(subject)} />
              <SecondaryButton label="Menu" onPress={onMenu} />
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SubjectTile({ subject, best, onPress }: { subject: SubjectId; best: number; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, best ${best}`}
      style={({ pressed }) => [menuStyles.tile, pressed && menuStyles.pressed]}>
      <Text style={styles.subjectBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <Text
        style={menuStyles.tileName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.4}>
        {name}
      </Text>
      <Text style={styles.subjectBest} maxFontSizeMultiplier={1.4}>
        Best {best}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboard: { ...StyleSheet.absoluteFill, backgroundColor: GameColors.backdrop },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: {
    width: '100%',
    maxWidth: 360,
    // Never taller than the screen: the "Who's playing?" tiles scroll instead.
    maxHeight: '100%',
    alignItems: 'center',
    gap: 12,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
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
  playingAs: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  playingAsText: { flexShrink: 1, fontSize: 15, color: GameColors.textDim },
  change: { fontSize: 15, fontWeight: '800', color: GameColors.glow },
  subjectBadge: { fontSize: 22, fontWeight: '900', color: GameColors.glow },
  subjectBest: { fontSize: 14, color: GameColors.textDim },
});
