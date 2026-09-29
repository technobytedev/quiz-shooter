import { configForLevel } from '../../src/game/difficulty';
import { makeChoices, makeMathQuestion, OPERATOR_SYMBOL } from '../../src/game/math';
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

describe('makeMathQuestion', () => {
  it('produces valid questions across levels 1-12', () => {
    for (let level = 1; level <= 12; level++) {
      const allowed = configForLevel(level).operators.map((op) => OPERATOR_SYMBOL[op]);
      for (let seed = 1; seed <= 200; seed++) {
        const q = makeMathQuestion(level, createRng(seed * 31 + level), 7);
        const [a, op, b] = q.prompt.split(' ');
        const answer = Number(q.answer);
        expect(q.id).toBe(7);
        expect(allowed).toContain(op);
        expect(EVAL[op](Number(a), Number(b))).toBe(answer);
        expect(Number.isInteger(answer)).toBe(true);
        expect(answer).toBeGreaterThanOrEqual(0);
        // Choices are canonical integer strings, so the answer pad shows "42", not "42.0".
        expect(q.choices.every((c) => String(Number(c)) === c)).toBe(true);
        expectValidChoices(q.choices.map(Number), answer);
      }
    }
  });

  it('uses the prompt as the key and reveals "<prompt> = <answer>"', () => {
    const q = makeMathQuestion(3, createRng(5), 1);
    expect(q.key).toBe(q.prompt);
    expect(q.reveal).toEqual({ before: `${q.prompt} = `, after: '' });
    expect(q.reveal.before + q.answer + q.reveal.after).toBe(`${q.prompt} = ${q.answer}`);
  });

  it('only uses addition at level 1', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(makeMathQuestion(1, createRng(seed), 1).prompt).toContain('+');
    }
  });

  it('eventually produces every operator at level 4', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      seen.add(makeMathQuestion(4, createRng(seed), 1).prompt.split(' ')[1]);
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
