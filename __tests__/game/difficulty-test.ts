import { configForLevel, levelForScore } from '../../src/game/difficulty';

describe('levelForScore', () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [19, 3],
    [20, 4],
    [29, 4],
    [30, 5],
    [39, 5],
    [40, 6],
    [1000, 102],
  ])('score %i is level %i', (score, level) => {
    expect(levelForScore(score)).toBe(level);
  });
});

describe('configForLevel', () => {
  it.each([
    [1, ['+']],
    [2, ['+', '-']],
    [3, ['+', '-', '×']],
    [4, ['+', '-', '×', '÷']],
    [9, ['+', '-', '×', '÷']],
  ])('level %i allows %j', (level, operators) => {
    expect(configForLevel(level as number).operators).toEqual(operators);
  });

  it.each([
    [1, 8000],
    [2, 7000],
    [3, 6000],
    [4, 5000],
    [5, 4600],
    [10, 2600],
    [11, 2500],
    [100, 2500],
  ])('level %i falls in %i ms', (level, fallMs) => {
    expect(configForLevel(level).fallMs).toBe(fallMs);
  });

  it('uses the spec ranges', () => {
    expect(configForLevel(1).addSub).toEqual({ min: 1, max: 10 });
    expect(configForLevel(2).addSub).toEqual({ min: 1, max: 20 });
    expect(configForLevel(3).mul).toEqual({ min: 2, max: 10 });
    expect(configForLevel(4)).toMatchObject({
      addSub: { min: 1, max: 50 },
      mul: { min: 2, max: 12 },
      divQuotient: { min: 2, max: 10 },
      divDivisor: { min: 2, max: 10 },
    });
    expect(configForLevel(5)).toMatchObject({
      addSub: { min: 1, max: 75 },
      mul: { min: 2, max: 13 },
      divQuotient: { min: 2, max: 11 },
    });
  });
});
