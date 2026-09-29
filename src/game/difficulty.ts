export type Operator = '+' | '-' | '×' | '÷';

export interface Range {
  min: number;
  max: number;
}

export interface LevelConfig {
  level: number;
  operators: Operator[];
  addSub: Range;
  mul: Range;
  divQuotient: Range;
  divDivisor: Range;
  fallMs: number;
}

const MIN_FALL_MS = 2500;

export function levelForScore(score: number): number {
  if (score < 5) return 1;
  if (score < 10) return 2;
  if (score < 20) return 3;
  if (score < 30) return 4;
  return 5 + Math.floor((score - 30) / 10);
}

export function configForLevel(level: number): LevelConfig {
  const base = {
    level,
    mul: { min: 2, max: 10 },
    divQuotient: { min: 2, max: 10 },
    divDivisor: { min: 2, max: 10 },
  };
  switch (level) {
    case 1:
      return { ...base, operators: ['+'], addSub: { min: 1, max: 10 }, fallMs: 8000 };
    case 2:
      return { ...base, operators: ['+', '-'], addSub: { min: 1, max: 20 }, fallMs: 7000 };
    case 3:
      return { ...base, operators: ['+', '-', '×'], addSub: { min: 1, max: 20 }, fallMs: 6000 };
  }
  const k = level - 4;
  return {
    ...base,
    operators: ['+', '-', '×', '÷'],
    addSub: { min: 1, max: 50 + 25 * k },
    mul: { min: 2, max: 12 + k },
    divQuotient: { min: 2, max: 10 + k },
    fallMs: Math.max(MIN_FALL_MS, 5000 - 400 * k),
  };
}
