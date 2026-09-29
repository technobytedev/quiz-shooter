import { cardSizeFor, HERO_HEIGHT } from '../../src/components/game/layout';

describe('cardSizeFor', () => {
  it('keeps the Math card at 168 x 64', () => {
    expect(cardSizeFor('math', 390)).toEqual({ width: 168, height: 64 });
  });

  it('makes the English card nearly full width, capped at 360, and 104 tall', () => {
    expect(cardSizeFor('english', 320)).toEqual({ width: 288, height: 104 });
    expect(cardSizeFor('english', 390)).toEqual({ width: 358, height: 104 });
    expect(cardSizeFor('english', 800)).toEqual({ width: 360, height: 104 });
  });

  it('never returns a negative width before layout', () => {
    expect(cardSizeFor('english', 0).width).toBe(0);
  });

  it('keeps the hero height', () => {
    expect(HERO_HEIGHT).toBe(76);
  });
});
