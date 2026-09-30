import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { MAX_NAME_LENGTH, type NameError } from '@/game/players';

import { GameColors } from './colors';
import { menuStyles, PrimaryButton, SecondaryButton } from './menu-parts';

const MESSAGES: Record<NameError, string> = {
  empty: 'Type a name.',
  'too-long': `Use ${MAX_NAME_LENGTH} characters or fewer.`,
  taken: 'That name is taken.',
};

interface NameFormProps {
  title: string;
  initialName: string;
  // Saves the name and returns null, or returns why it was refused.
  onSave: (name: string) => NameError | null;
  onCancel: () => void;
}

// Creates or renames a player. It sits in the menu panel, which keeps it above the on-screen keyboard.
export function NameForm({ title, initialName, onSave, onCancel }: NameFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<NameError | null>(null);

  const save = () => setError(onSave(name));

  return (
    <>
      <Text style={menuStyles.title} maxFontSizeMultiplier={1.4} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        onSubmitEditing={save}
        placeholder="Name"
        placeholderTextColor={GameColors.textDim}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        maxFontSizeMultiplier={1.4}
        accessibilityLabel="Player name"
      />
      {error && (
        <Text style={styles.error} maxFontSizeMultiplier={1.4} accessibilityLiveRegion="polite">
          {MESSAGES[error]}
        </Text>
      )}
      <PrimaryButton label="Save" onPress={save} maxFontSizeMultiplier={1.4} />
      <SecondaryButton label="Cancel" onPress={onCancel} maxFontSizeMultiplier={1.4} />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    alignSelf: 'stretch',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.button,
    color: GameColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  error: { fontSize: 15, fontWeight: '700', color: GameColors.danger, textAlign: 'center' },
});
