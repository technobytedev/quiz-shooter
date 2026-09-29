import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';
import { HERO_HEIGHT } from './layout';

interface HeroProps {
  firing: boolean;
  hitCount: number;
}

export function Hero({ firing, hitCount }: HeroProps) {
  const damage = useSharedValue(0);
  const muzzle = useSharedValue(0);

  useEffect(() => {
    if (hitCount === 0) return;
    damage.set(withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 420 })));
  }, [hitCount, damage]);

  useEffect(() => {
    if (!firing) return;
    muzzle.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 160 })));
  }, [firing, muzzle]);

  const damageStyle = useAnimatedStyle(() => ({ opacity: damage.get() }));
  const muzzleStyle = useAnimatedStyle(() => ({
    opacity: muzzle.get(),
    transform: [{ scale: 0.6 + muzzle.get() * 0.6 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.muzzle, muzzleStyle]} />
      <View style={styles.barrel} />
      <View>
        <View style={styles.body} />
        <Animated.View style={[styles.body, styles.damage, damageStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    pointerEvents: 'none',
  },
  muzzle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: -4,
    backgroundColor: GameColors.bullet,
  },
  barrel: {
    width: 8,
    height: 20,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: GameColors.glow,
  },
  // Triangle made from borders so no image assets are needed.
  body: {
    width: 0,
    height: 0,
    borderLeftWidth: 28,
    borderRightWidth: 28,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: GameColors.hero,
  },
  damage: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderBottomColor: GameColors.danger,
  },
});
