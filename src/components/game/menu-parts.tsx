import { Pressable, StyleSheet, Text } from 'react-native';

import { GameColors } from './colors';

// Buttons and styles shared by the menu panels (subject picker, "Who's playing?", name form, pause and
// game over) and the Scoreboard screen, so they all look the same.

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [menuStyles.button, pressed && menuStyles.pressed]}>
      <Text style={menuStyles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [menuStyles.secondaryButton, pressed && menuStyles.pressed]}>
      <Text style={menuStyles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export const menuStyles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '900', color: GameColors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: GameColors.textDim, textAlign: 'center', marginBottom: 4 },
  // Tiles wrap two per row, like the answer pad.
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
  },
  // The name fills the tile's width, so a long name ("Mathematics") shrinks to fit instead of wrapping.
  tileName: { alignSelf: 'stretch', textAlign: 'center', fontSize: 18, fontWeight: '800', color: GameColors.text },
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
