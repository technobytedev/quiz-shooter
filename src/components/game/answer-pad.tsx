import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';

const PLACEHOLDERS = [0, 1, 2, 3];

interface AnswerPadProps {
  questionId: number | null;
  choices: number[];
  disabledChoices: number[];
  locked: boolean;
  onAnswer: (value: number) => void;
}

export function AnswerPad({ questionId, choices, disabledChoices, locked, onAnswer }: AnswerPadProps) {
  return (
    <View style={styles.pad}>
      {questionId === null
        ? PLACEHOLDERS.map((i) => <View key={i} style={[styles.slot, styles.button, styles.placeholder]} />)
        : choices.map((value) => (
            // Keyed by question so shake/disabled state resets for each new question.
            <AnswerButton
              key={`${questionId}-${value}`}
              value={value}
              wrong={disabledChoices.includes(value)}
              locked={locked}
              onPress={onAnswer}
            />
          ))}
    </View>
  );
}

interface AnswerButtonProps {
  value: number;
  wrong: boolean;
  locked: boolean;
  onPress: (value: number) => void;
}

function AnswerButton({ value, wrong, locked, onPress }: AnswerButtonProps) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!wrong) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withRepeat(withTiming(10, { duration: 80 }), 4, true),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [wrong, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <Animated.View style={[styles.slot, shakeStyle]}>
      <Pressable
        disabled={wrong || locked}
        onPress={() => onPress(value)}
        style={({ pressed }) => [styles.button, wrong && styles.wrong, pressed && styles.pressed]}>
        <Text style={[styles.label, wrong && styles.wrongLabel]} maxFontSizeMultiplier={1.4}>
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  slot: { flexBasis: '46%', flexGrow: 1 },
  button: {
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.buttonBorder,
    backgroundColor: GameColors.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { opacity: 0.4 },
  pressed: { borderColor: GameColors.glow, transform: [{ scale: 0.97 }] },
  wrong: { borderColor: GameColors.danger, backgroundColor: '#3A1426' },
  label: {
    fontSize: 28,
    fontWeight: '800',
    color: GameColors.text,
    fontVariant: ['tabular-nums'],
  },
  wrongLabel: { color: GameColors.danger },
});
