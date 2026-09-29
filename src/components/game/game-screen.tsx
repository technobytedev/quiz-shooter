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

import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { SUBJECTS, type SubjectId } from '@/game/subjects';
import { useBestScores } from '@/hooks/use-best-scores';

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
  const { best, submit } = useBestScores();
  // This subject's best when the run began. It can be stale if the stored best finished loading
  // after the run started, so "New best!" also requires the score to reach the live best.
  const [bestAtStart, setBestAtStart] = useState(0);
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);
  const {
    phase,
    subject,
    score,
    level,
    lives,
    question,
    disabledChoices,
    destroying,
    revealing,
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
    if (phase === 'gameover') submit(subject, score);
  }, [phase, subject, score, submit]);

  const handleStart = useCallback(
    (next: SubjectId) => {
      setBestAtStart(best[next]);
      dispatch({ type: 'START', subject: next });
    },
    [best],
  );

  // Leaving mid-run still counts the run's score toward this subject's best.
  const handleMenu = useCallback(() => {
    submit(subject, score);
    dispatch({ type: 'QUIT' });
  }, [subject, score, submit]);

  const handleAnswer = useCallback(
    (value: string) => {
      if (!question) return;
      // The reducer ignores taps while paused, shattering or revealing, so don't buzz for them either.
      if (phase === 'playing' && !destroying && !revealing && value === question.answer) {
        haptic(Haptics.ImpactFeedbackStyle.Light);
      }
      // Tagged with the tapped question's id so the reducer can drop a tap that lands after it was replaced.
      dispatch({ type: 'ANSWER', questionId: question.id, value, progress: progress.get() });
    },
    [phase, destroying, revealing, question, progress],
  );

  // Stable identities matter: FallingQuestion restarts its fall when these change.
  const handleHit = useCallback(() => dispatch({ type: 'QUESTION_HIT' }), []);
  const handleDestroyed = useCallback(() => dispatch({ type: 'DESTROY_DONE' }), []);
  const handleRevealed = useCallback(() => dispatch({ type: 'REVEAL_DONE' }), []);
  const handlePause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const handleResume = useCallback(() => dispatch({ type: 'RESUME' }), []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Hud
          subject={subject}
          lives={lives}
          level={level}
          score={score}
          canPause={phase === 'playing'}
          onPause={handlePause}
        />
        <Animated.View style={[styles.playArea, shakeStyle]}>
          <FallingQuestion
            question={question}
            subject={subject}
            fallMs={SUBJECTS[subject].fallMs(level)}
            paused={phase !== 'playing'}
            destroying={destroying}
            revealing={revealing}
            lastPoints={lastPoints}
            progress={progress}
            onHit={handleHit}
            onDestroyed={handleDestroyed}
            onRevealed={handleRevealed}
          />
          <Hero firing={destroying} hitCount={hitCount} />
        </Animated.View>
        <AnswerPad
          questionId={question?.id ?? null}
          choices={question?.choices ?? []}
          disabledChoices={disabledChoices}
          highlightedChoice={revealing && question ? question.answer : null}
          locked={phase !== 'playing' || destroying || revealing}
          onAnswer={handleAnswer}
        />
      </SafeAreaView>
      <Overlay
        phase={phase}
        subject={subject}
        score={score}
        best={best}
        isNewBest={phase === 'gameover' && score > bestAtStart && score >= best[subject]}
        onStart={handleStart}
        onResume={handleResume}
        onMenu={handleMenu}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1 },
  playArea: { flex: 1 },
});
