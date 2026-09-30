import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameColors } from '@/components/game/colors';
import { menuStyles } from '@/components/game/menu-parts';
import { Starfield } from '@/components/game/starfield';
import { scoreboardRows, type ScoreRow } from '@/game/players';
import { SUBJECT_IDS, SUBJECTS, type SubjectId } from '@/game/subjects';
import { usePlayers } from '@/hooks/players-store';

interface ScoreboardScreenProps {
  initialSubject: SubjectId;
  // The player whose row gets the glowing border, if any.
  highlightId: string | null;
}

export function ScoreboardScreen({ initialSubject, highlightId }: ScoreboardScreenProps) {
  const { loaded, players } = usePlayers();
  const [subject, setSubject] = useState(initialSubject);
  const rows = scoreboardRows(players, subject);

  // Opened straight from a link (e.g. a web refresh), there is no screen to go back to.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && menuStyles.pressed]}>
            <Text style={styles.backLabel} maxFontSizeMultiplier={1.4}>
              ‹ Back
            </Text>
          </Pressable>
          <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
            Scoreboard
          </Text>
        </View>
        <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Subjects">
          {SUBJECT_IDS.map((id) => (
            <SubjectTab key={id} subject={id} selected={id === subject} onPress={() => setSubject(id)} />
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {loaded && rows.length === 0 && (
            <Text style={styles.empty} maxFontSizeMultiplier={1.4}>
              No games yet.
            </Text>
          )}
          {rows.map((row) => (
            <Row key={row.player.id} row={row} highlighted={row.player.id === highlightId} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SubjectTab({ subject, selected, onPress }: { subject: SubjectId; selected: boolean; onPress: () => void }) {
  const { name, badge } = SUBJECTS[subject];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && menuStyles.pressed]}>
      <Text style={styles.tabBadge} maxFontSizeMultiplier={1.4}>
        {badge}
      </Text>
      <Text
        style={[styles.tabName, selected && styles.tabNameSelected]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.4}>
        {name}
      </Text>
    </Pressable>
  );
}

function Row({ row, highlighted }: { row: ScoreRow; highlighted: boolean }) {
  return (
    <View
      style={[styles.row, highlighted && styles.rowHighlighted]}
      accessible
      accessibilityLabel={`Rank ${row.rank}, ${row.player.name}, best ${row.best}`}>
      <Text style={styles.rank} maxFontSizeMultiplier={1.4}>
        {row.rank}
      </Text>
      <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {row.player.name}
      </Text>
      <Text style={styles.best} maxFontSizeMultiplier={1.4}>
        {row.best}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  back: { paddingVertical: 6, paddingHorizontal: 4 },
  backLabel: { fontSize: 18, fontWeight: '700', color: GameColors.glow },
  title: { flexShrink: 1, fontSize: 28, fontWeight: '900', color: GameColors.text },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
  tabSelected: { borderColor: GameColors.glow, backgroundColor: GameColors.button },
  tabBadge: { fontSize: 16, fontWeight: '900', color: GameColors.glow },
  tabName: { alignSelf: 'stretch', textAlign: 'center', fontSize: 13, fontWeight: '700', color: GameColors.textDim },
  tabNameSelected: { color: GameColors.text },
  list: { gap: 8, paddingBottom: 24 },
  empty: { marginTop: 32, fontSize: 18, color: GameColors.textDim, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.panel,
  },
  rowHighlighted: { borderColor: GameColors.glow, backgroundColor: GameColors.button },
  rank: { minWidth: 32, fontSize: 18, fontWeight: '900', color: GameColors.glow, fontVariant: ['tabular-nums'] },
  name: { flex: 1, fontSize: 18, fontWeight: '700', color: GameColors.text },
  best: { fontSize: 20, fontWeight: '800', color: GameColors.text, fontVariant: ['tabular-nums'] },
});
