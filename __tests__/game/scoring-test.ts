import { pointsFor } from '../../src/game/scoring';

describe('pointsFor', () => {
  it.each([
    [0, 3],
    [0.33, 3],
    [1 / 3, 2],
    [0.5, 2],
    [2 / 3, 1],
    [0.99, 1],
    [1, 1],
  ])('progress %f earns %i', (progress, points) => {
    expect(pointsFor(progress)).toBe(points);
  });
});
