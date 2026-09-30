import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';
import { HERO_BOTTOM_PADDING, HERO_HEIGHT, SHIP_SIZE } from './layout';

const SHIP_IMAGE = require('@/assets/images/shooter-spaceship.png');
const MUZZLE_SIZE = 14;

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
      <View style={styles.ship}>
        <Image source={SHIP_IMAGE} style={styles.shipImage} resizeMode="contain" />
        {/* The same ship tinted red, flashed when a question lands on it. */}
        <Animated.View style={[styles.overlay, damageStyle]}>
          <Image source={SHIP_IMAGE} style={[styles.shipImage, styles.damageTint]} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.muzzle, muzzleStyle]} />
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
    paddingBottom: HERO_BOTTOM_PADDING,
    pointerEvents: 'none',
  },
  ship: { width: SHIP_SIZE.width, height: SHIP_SIZE.height },
  shipImage: { width: SHIP_SIZE.width, height: SHIP_SIZE.height },
  overlay: { ...StyleSheet.absoluteFill },
  damageTint: { tintColor: GameColors.danger },
  // Centered on the ship's nose, which is the top middle of the image.
  muzzle: {
    position: 'absolute',
    top: -MUZZLE_SIZE / 2,
    left: (SHIP_SIZE.width - MUZZLE_SIZE) / 2,
    width: MUZZLE_SIZE,
    height: MUZZLE_SIZE,
    borderRadius: MUZZLE_SIZE / 2,
    backgroundColor: GameColors.bullet,
  },
});
