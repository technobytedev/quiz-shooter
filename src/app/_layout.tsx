import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GameColors } from '@/components/game/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: GameColors.background } }}
      />
    </>
  );
}
