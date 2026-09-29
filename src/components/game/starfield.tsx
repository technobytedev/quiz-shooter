import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from './colors';

const STAR_COUNT = 50;
const DRIFT_MS = 40000;

interface Star {
  left: number;
  top: number;
  size: number;
  opacity: number;
}

function makeStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() < 0.8 ? 1.5 : 2.5,
    opacity: 0.3 + Math.random() * 0.6,
  }));
}

export function Starfield() {
  const [stars] = useState(makeStars);
  const [height, setHeight] = useState(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.set(withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(drift);
  }, [drift]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.get() * height }],
  }));

  // Two identical layers stacked vertically so the loop is seamless.
  const renderLayer = (offset: number) => (
    <View key={offset} style={[styles.layer, { top: offset, height }]}>
      {stars.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
          {renderLayer(0)}
          {renderLayer(-height)}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  star: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: GameColors.star,
  },
});
