import { configForLevel, type Operator } from './difficulty';
import { pick, randInt, shuffle, type Rng } from './random';

export interface Question {
  id: number;
  text: string;
  answer: number;
  choices: number[];
}

export const OPERATOR_SYMBOL: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '×': '×',
  '÷': '÷',
};

const SMALL_OFFSETS = [-3, -2, -1, 1, 2, 3];
const LARGE_OFFSETS = [-10, 10];

export function makeQuestion(level: number, rng: Rng, id: number): Question {
  const config = configForLevel(level);
  const op = pick(rng, config.operators);
  let a: number;
  let b: number;
  let answer: number;

  switch (op) {
    case '+':
      a = randInt(rng, config.addSub.min, config.addSub.max);
      b = randInt(rng, config.addSub.min, config.addSub.max);
      answer = a + b;
      break;
    case '-': {
      const x = randInt(rng, config.addSub.min, config.addSub.max);
      const y = randInt(rng, config.addSub.min, config.addSub.max);
      a = Math.max(x, y);
      b = Math.min(x, y);
      answer = a - b;
      break;
    }
    case '×':
      a = randInt(rng, config.mul.min, config.mul.max);
      b = randInt(rng, config.mul.min, config.mul.max);
      answer = a * b;
      break;
    case '÷':
      // Built backwards so the division is always exact.
      answer = randInt(rng, config.divQuotient.min, config.divQuotient.max);
      b = randInt(rng, config.divDivisor.min, config.divDivisor.max);
      a = answer * b;
      break;
  }

  return { id, text: `${a} ${OPERATOR_SYMBOL[op]} ${b}`, answer, choices: makeChoices(answer, rng) };
}

export function makeChoices(answer: number, rng: Rng): number[] {
  const offsets = answer >= 20 ? [...SMALL_OFFSETS, ...LARGE_OFFSETS] : SMALL_OFFSETS;
  // At least three positive small offsets always survive the filter, so this never runs short.
  const distractors = shuffle(rng, offsets)
    .map((offset) => answer + offset)
    .filter((value) => value >= 0)
    .slice(0, 3);
  return shuffle(rng, [answer, ...distractors]);
}
