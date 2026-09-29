import { useCallback, useEffect, useReducer, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createRng } from '@/game/random';
import { createGameReducer, createInitialState } from '@/game/reducer';
import { useBestScore } from '@/hooks/use-best-score';

import { AnswerPad } from './answer-pad';
import { GameColors } from './colors';
import { Hud } from './hud';
import { Overlay } from './overlay';
import { Starfield } from './starfield';

export function GameScreen() {
  const [reducer] = useState(() => createGameReducer(createRng(Date.now())));
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { best, submit } = useBestScore();
  const [bestAtStart, setBestAtStart] = useState(0);
  const { phase, score, level, lives, question, disabledChoices, destroying } = state;

  useEffect(() => {
    if (phase === 'gameover') submit(score);
  }, [phase, score, submit]);

  const handleStart = useCallback(() => {
    setBestAtStart(best);
    dispatch({ type: 'START' });
  }, [best]);

  const handleAnswer = useCallback((value: number) => {
    dispatch({ type: 'ANSWER', value, progress: 0 });
  }, []);

  return (
    <View style={styles.root}>
      <Starfield />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Hud
          lives={lives}
          level={level}
          score={score}
          canPause={phase === 'playing'}
          onPause={() => dispatch({ type: 'PAUSE' })}
        />
        <View style={styles.playArea}>
          {question && <Text style={styles.card}>{question.text}</Text>}
        </View>
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
        onResume={() => dispatch({ type: 'RESUME' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GameColors.background },
  safe: { flex: 1 },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { fontSize: 30, fontWeight: '800', color: GameColors.text },
});
