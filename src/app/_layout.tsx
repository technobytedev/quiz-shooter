import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GameColors } from '@/components/game/colors';
import { PlayersProvider } from '@/hooks/players-store';

export default function RootLayout() {
  return (
    // One shared copy of the players for the game screen and the Scoreboard screen.
    <PlayersProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: GameColors.background } }}
      />
    </PlayersProvider>
  );
}
