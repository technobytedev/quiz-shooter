import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { configForLevel } from '@/game/difficulty';
import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { useBestScore } from '@/hooks/use-best-score';

import { AnswerPad } from './answer-pad';
import { GameColors } from './colors';
import { FallingQuestion } from './falling-question';
import { Hero } from './hero';
import { Hud } from './hud';
import { Overlay } from './overlay';
import { Starfield } from './starfield';

function haptic(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

export function GameScreen() {
  const [reducer] = useState(() => createGameReducer(createRng(Date.now())));
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { best, submit } = useBestScore();
  const [bestAtStart, setBestAtStart] = useState(0);
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);
  const {
    phase,
    score,
    level,
    lives,
    question,
    disabledChoices,
    destroying,
    lastPoints,
    damageCount,
    hitCount,
  } = state;

  // Backgrounding the app (calls, app switcher) pauses so no lives are lost unseen.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') dispatch({ type: 'PAUSE' });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (damageCount > 0) haptic(Haptics.ImpactFeedbackStyle.Heavy);
  }, [damageCount]);

  useEffect(() => {
    if (hitCount === 0) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 40 }),
        withTiming(10, { duration: 40 }),
        withTiming(-6, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      ),
    );
  }, [hitCount, shake]);

  useEffect(() => {
    if (phase === 'gameover') submit(score);
  }, [phase, score, submit]);

  const handleStart = useCallback(() => {
    setBestAtStart(best);
    dispatch({ type: 'START' });
  }, [best]);

  const handleAnswer = useCallback(
    (value: number) => {
      if (!question) return;
      // The reducer ignores taps while paused or shattering, so don't buzz for them either.
      if (phase === 'playing' && !destroying && value === question.answer) {
        haptic(Haptics.ImpactFeedbackStyle.Light);
      }
      // Tagged with the tapped question's id so the reducer can drop a tap that lands after it was replaced.
      dispatch({ type: 'ANSWER', questionId: question.id, value, progress: progress.get() });
    },
    [phase, destroying, question, progress],
  );

  // Stable identities matter: FallingQuestion restarts its fall when these change.
  const handleHit = useCallback(() => dispatch({ type: 'QUESTION_HIT' }), []);
  const handleDestroyed = useCallback(() => dispatch({ type: 'DESTROY_DONE' }), []);
  const handlePause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const handleResume = useCallback(() => dispatch({ type: 'RESUME' }), []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Hud lives={lives} level={level} score={score} canPause={phase === 'playing'} onPause={handlePause} />
        <Animated.View style={[styles.playArea, shakeStyle]}>
          <FallingQuestion
            question={question}
            fallMs={configForLevel(level).fallMs}
            paused={phase !== 'playing'}
            destroying={destroying}
            lastPoints={lastPoints}
            progress={progress}
            onHit={handleHit}
            onDestroyed={handleDestroyed}
          />
          <Hero firing={destroying} hitCount={hitCount} />
        </Animated.View>
        <AnswerPad
          questionId={question?.id ?? null}
          choices={question?.choices ?? []}
          disabledChoices={disabledChoices}
          locked={phase !== 'playing' || destroying}
          onAnswer={handleAnswer}
        />
      </SafeAreaView>
      <Overlay
        phase={phase}
        score={score}
        best={best}
        isNewBest={phase === 'gameover' && score > bestAtStart}
        onStart={handleStart}
        onResume={handleResume}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1 },
  playArea: { flex: 1 },
});
