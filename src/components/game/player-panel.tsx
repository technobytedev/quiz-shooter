import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { byMostRecent, type Player } from '@/game/players';
import { usePlayers } from '@/hooks/players-store';

import { GameColors } from './colors';
import { menuStyles, SecondaryButton } from './menu-parts';
import { NameForm } from './name-form';

interface PlayerPanelProps {
  onChoose: (playerId: string) => void;
  onScoreboard: () => void;
}

type Form = { kind: 'new' } | { kind: 'rename'; player: Player };

// "Who's playing?": pick a saved player, add a new one, or rename one in edit mode.
export function PlayerPanel({ onChoose, onScoreboard }: PlayerPanelProps) {
  const { loaded, players, createPlayer, renamePlayer } = usePlayers();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);

  if (form?.kind === 'new') {
    return (
      <NameForm
        title="New player"
        initialName=""
        onSave={(name) => {
          const result = createPlayer(name);
          if ('error' in result) return result.error;
          setForm(null);
          onChoose(result.id);
          return null;
        }}
        onCancel={() => setForm(null)}
      />
    );
  }
  if (form?.kind === 'rename') {
    return (
      <NameForm
        title={`Rename ${form.player.name}`}
        initialName={form.player.name}
        onSave={(name) => {
          const error = renamePlayer(form.player.id, name);
          if (!error) setForm(null);
          return error;
        }}
        onCancel={() => setForm(null)}
      />
    );
  }

  return (
    <>
      <Text style={menuStyles.title} maxFontSizeMultiplier={1.4}>
        {"Who's playing?"}
      </Text>
      {loaded && (
        <>
          {editing && (
            <Text style={menuStyles.subtitle} maxFontSizeMultiplier={1.4}>
              Tap a name to rename it
            </Text>
          )}
          <ScrollView style={styles.scroll} contentContainerStyle={menuStyles.grid}>
            {byMostRecent(players).map((player) => (
              <PlayerTile
                key={player.id}
                label={player.name}
                accessibilityLabel={editing ? `Rename ${player.name}` : `Play as ${player.name}`}
                onPress={() => (editing ? setForm({ kind: 'rename', player }) : onChoose(player.id))}
              />
            ))}
            {!editing && (
              <PlayerTile
                label="+ New player"
                accessibilityLabel="New player"
                dim
                onPress={() => setForm({ kind: 'new' })}
              />
            )}
          </ScrollView>
          <View style={styles.actions}>
            <SecondaryButton label="Scoreboard" onPress={onScoreboard} maxFontSizeMultiplier={1.4} />
            {players.length > 0 && (
              <SecondaryButton
                label={editing ? 'Done' : 'Edit names'}
                onPress={() => setEditing(!editing)}
                maxFontSizeMultiplier={1.4}
              />
            )}
          </View>
        </>
      )}
    </>
  );
}

interface PlayerTileProps {
  label: string;
  accessibilityLabel: string;
  // The "+ New player" tile has a quieter border than the players' tiles.
  dim?: boolean;
  onPress: () => void;
}

function PlayerTile({ label, accessibilityLabel, dim = false, onPress }: PlayerTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [menuStyles.tile, dim && styles.dimTile, pressed && menuStyles.pressed]}>
      <Text
        style={menuStyles.tileName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Shrinks and scrolls when there are more players than fit on the screen.
  scroll: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 1 },
  actions: { alignSelf: 'stretch', gap: 12 },
  dimTile: { borderColor: GameColors.buttonBorder },
});
