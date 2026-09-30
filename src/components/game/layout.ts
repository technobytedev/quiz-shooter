import type { CardKind } from '@/game/subjects';

// Height reserved at the bottom of the play area for the hero; its top is the danger line.
export const HERO_HEIGHT = 76;

export interface CardSize {
  width: number;
  height: number;
}

// Short prompts ("12 × 7") fit a small card; sentences need a wide card with room for three lines.
export function cardSizeFor(card: CardKind, playAreaWidth: number): CardSize {
  if (card === 'sentence') {
    return { width: Math.max(0, Math.min(playAreaWidth - 32, 360)), height: 104 };
  }
  return { width: 168, height: 64 };
}
