import { configForLevel } from '../../src/game/difficulty';
import { makeChoices, makeQuestion, OPERATOR_SYMBOL } from '../../src/game/questions';
import { createRng } from '../../src/game/random';

const EVAL: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => a / b,
};

function expectValidChoices(choices: number[], answer: number) {
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);
  expect(choices.filter((c) => c === answer)).toHaveLength(1);
  for (const c of choices) {
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(0);
  }
}

describe('makeQuestion', () => {
  it('produces valid questions across levels 1-12', () => {
    for (let level = 1; level <= 12; level++) {
      const allowed = configForLevel(level).operators.map((op) => OPERATOR_SYMBOL[op]);
      for (let seed = 1; seed <= 200; seed++) {
        const q = makeQuestion(level, createRng(seed * 31 + level), 7);
        const [a, op, b] = q.text.split(' ');
        expect(q.id).toBe(7);
        expect(allowed).toContain(op);
        expect(EVAL[op](Number(a), Number(b))).toBe(q.answer);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expectValidChoices(q.choices, q.answer);
      }
    }
  });

  it('only uses addition at level 1', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(makeQuestion(1, createRng(seed), 1).text).toContain('+');
    }
  });

  it('eventually produces every operator at level 4', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      seen.add(makeQuestion(4, createRng(seed), 1).text.split(' ')[1]);
    }
    expect([...seen].sort()).toEqual(['+', '×', '÷', '−'].sort());
  });
});

describe('makeChoices', () => {
  it('makeChoices handles small answers', () => {
    for (const answer of [0, 1, 2]) {
      for (let seed = 1; seed <= 100; seed++) {
        expectValidChoices(makeChoices(answer, createRng(seed)), answer);
      }
    }
  });

  it('keeps distractors near the answer', () => {
    for (const answer of [5, 19, 20, 21, 100, 500]) {
      for (let seed = 1; seed <= 100; seed++) {
        const choices = makeChoices(answer, createRng(seed));
        expectValidChoices(choices, answer);
        for (const c of choices) {
          expect(Math.abs(c - answer)).toBeLessThanOrEqual(answer >= 20 ? 10 : 3);
        }
      }
    }
  });

  it('sometimes uses a ±10 distractor for answers ≥ 20', () => {
    const hasTen = Array.from({ length: 100 }, (_, seed) =>
      makeChoices(50, createRng(seed + 1)).some((c) => c === 40 || c === 60),
    );
    expect(hasTen).toContain(true);
  });

  it('does not always put the answer first', () => {
    const positions = new Set(
      Array.from({ length: 50 }, (_, seed) => makeChoices(10, createRng(seed + 1)).indexOf(10)),
    );
    expect(positions.size).toBeGreaterThan(1);
  });
});
