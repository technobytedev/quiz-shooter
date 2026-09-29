import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Question } from '@/game/questions';

import { GameColors } from './colors';
import { CARD_HEIGHT, CARD_WIDTH, HERO_HEIGHT } from './layout';

const BULLET_MS = 150;
// Fragments finish at FRAGMENT_END of the break; the remainder is the ~300ms gap before the next question.
const BREAK_MS = 750;
const FRAGMENT_END = 0.6;
const BULLET_HEIGHT = 18;
const FRAGMENTS = [
  { dx: -1, dy: -0.7, spin: -220 },
  { dx: 1, dy: -0.7, spin: 200 },
  { dx: -1.1, dy: 0.3, spin: 160 },
  { dx: 1.1, dy: 0.3, spin: -180 },
  { dx: -0.4, dy: 0.9, spin: 260 },
  { dx: 0.4, dy: 0.9, spin: -240 },
];

interface FallingQuestionProps {
  question: Question | null;
  fallMs: number;
  paused: boolean;
  destroying: boolean;
  lastPoints: number;
  progress: SharedValue<number>;
  onHit: () => void;
  onDestroyed: () => void;
}

export function FallingQuestion({
  question,
  fallMs,
  paused,
  destroying,
  lastPoints,
  progress,
  onHit,
  onDestroyed,
}: FallingQuestionProps) {
  const [playHeight, setPlayHeight] = useState(0);
  const bullet = useSharedValue(0);
  const shatter = useSharedValue(0);
  // Id of the question whose fall was last started; tells a fresh question from a resume.
  const startedIdRef = useRef<number | null>(null);
  const questionId = question?.id ?? null;
  const travel = Math.max(0, playHeight - HERO_HEIGHT - CARD_HEIGHT);
  const heroTop = Math.max(0, playHeight - HERO_HEIGHT);

  // New question: back to the top, clear bullet/shatter. These sets are only queued to the UI
  // runtime, so progress.get() can still return the previous question's value in the same commit.
  // The fall effect therefore never reads progress for a fresh question (see startedIdRef).
  useEffect(() => {
    progress.set(0);
    bullet.set(0);
    shatter.set(0);
  }, [questionId, progress, bullet, shatter]);

  // Fall for the full fallMs when the question is new, or resume for whatever time is left when
  // it is the same question after a pause; freeze on pause or when shot. The queued reset above
  // runs before the queued timing below, so a fresh fall starts from 0.
  // The fall, bullet and shatter are game timing, not decoration, so they opt out of the OS
  // reduce-motion setting (reduceMotion: ReduceMotion.Never). With the default, Reanimated jumps
  // to the end and reports finished on the first frame, so every question would land instantly.
  useEffect(() => {
    if (questionId === null || paused || destroying || playHeight === 0) return;
    const fresh = questionId !== startedIdRef.current;
    startedIdRef.current = questionId;
    const remaining = fresh ? fallMs : Math.max(0, fallMs * (1 - progress.get()));
    progress.set(
      withTiming(1, { duration: remaining, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (finished) scheduleOnRN(onHit);
      }),
    );
    return () => cancelAnimation(progress);
  }, [questionId, paused, destroying, playHeight, fallMs, progress, onHit]);

  // Correct answer: bullet flies up, then the card shatters, then report back.
  useEffect(() => {
    if (!destroying) return;
    bullet.set(
      withTiming(1, { duration: BULLET_MS, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (!finished) return;
        shatter.set(
          withTiming(1, { duration: BREAK_MS, reduceMotion: ReduceMotion.Never }, (done) => {
            if (done) scheduleOnRN(onDestroyed);
          }),
        );
      }),
    );
  }, [destroying, bullet, shatter, onDestroyed]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: shatter.get() > 0 ? 0 : 1,
    transform: [{ translateY: progress.get() * travel }],
  }));

  const bulletStyle = useAnimatedStyle(() => {
    const b = bullet.get();
    const start = heroTop - BULLET_HEIGHT;
    const target = progress.get() * travel + CARD_HEIGHT;
    return {
      opacity: b > 0 && b < 1 ? 1 : 0,
      transform: [{ translateY: start - b * (start - target) }],
    };
  });

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * travel + CARD_HEIGHT / 2 }],
  }));

  const pointsStyle = useAnimatedStyle(() => {
    const s = shatter.get();
    return { opacity: s > 0 ? 1 - s : 0, transform: [{ translateY: -60 * s }] };
  });

  return (
    <View style={styles.root} onLayout={(e) => setPlayHeight(e.nativeEvent.layout.height)}>
      {question && (
        <>
          <Animated.View style={[styles.cardLane, cardStyle]}>
            <View style={styles.card}>
              <Text
                style={styles.cardText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                maxFontSizeMultiplier={1.4}>
                {question.text}
              </Text>
            </View>
          </Animated.View>
          <Animated.View style={[styles.bullet, bulletStyle]} />
          <Animated.View style={[styles.burst, burstStyle]}>
            {FRAGMENTS.map((f, i) => (
              <Fragment key={i} shatter={shatter} {...f} />
            ))}
            <Animated.Text style={[styles.points, pointsStyle]} maxFontSizeMultiplier={1.4}>
              +{lastPoints}
            </Animated.Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

interface FragmentProps {
  shatter: SharedValue<number>;
  dx: number;
  dy: number;
  spin: number;
}

function Fragment({ shatter, dx, dy, spin }: FragmentProps) {
  const style = useAnimatedStyle(() => {
    const s = shatter.get();
    const p = interpolate(s, [0, FRAGMENT_END], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: s > 0 ? 1 - p : 0,
      transform: [{ translateX: dx * 90 * p }, { translateY: dy * 90 * p }, { rotate: `${spin * p}deg` }],
    };
  });
  return <Animated.View style={[styles.fragment, style]} />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  cardLane: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GameColors.glow,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  cardText: {
    fontSize: 30,
    fontWeight: '800',
    color: GameColors.cardText,
    fontVariant: ['tabular-nums'],
  },
  bullet: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: BULLET_HEIGHT,
    borderRadius: 3,
    backgroundColor: GameColors.bullet,
  },
  // Zero-size anchor at the card's centre; fragments are placed relative to it.
  burst: { position: 'absolute', top: 0, left: '50%', width: 0, height: 0 },
  fragment: {
    position: 'absolute',
    left: -14,
    top: -10,
    width: 28,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GameColors.glow,
    backgroundColor: GameColors.card,
  },
  points: {
    position: 'absolute',
    left: -40,
    top: -14,
    width: 80,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: GameColors.success,
  },
});
