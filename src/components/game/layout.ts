import type { SubjectId } from '@/game/subjects';

// Height reserved at the bottom of the play area for the hero; its top is the danger line.
export const HERO_HEIGHT = 76;

export interface CardSize {
  width: number;
  height: number;
}

// Math prompts are short ("12 × 7"); English sentences need a wide card with room for three lines.
export function cardSizeFor(subject: SubjectId, playAreaWidth: number): CardSize {
  if (subject === 'english') {
    return { width: Math.max(0, Math.min(playAreaWidth - 32, 360)), height: 104 };
  }
  return { width: 168, height: 64 };
}
