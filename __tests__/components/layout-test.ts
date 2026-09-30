import { cardSizeFor, HERO_BOTTOM_PADDING, HERO_HEIGHT, SHIP_SIZE } from '../../src/components/game/layout';

describe('cardSizeFor', () => {
  it('keeps the short card at 168 x 64', () => {
    expect(cardSizeFor('short', 390)).toEqual({ width: 168, height: 64 });
  });

  it('makes the sentence card nearly full width, capped at 360, and 104 tall', () => {
    expect(cardSizeFor('sentence', 320)).toEqual({ width: 288, height: 104 });
    expect(cardSizeFor('sentence', 390)).toEqual({ width: 358, height: 104 });
    expect(cardSizeFor('sentence', 800)).toEqual({ width: 360, height: 104 });
  });

  it('never returns a negative width before layout', () => {
    expect(cardSizeFor('sentence', 0).width).toBe(0);
  });

  it('keeps the hero height', () => {
    expect(HERO_HEIGHT).toBe(76);
  });

  it('draws the ship at the image proportions, standing inside the hero strip', () => {
    // assets/images/shooter-spaceship.png is 520 x 480. A ship taller than the strip would poke into
    // the zone where cards land.
    expect(SHIP_SIZE.width / SHIP_SIZE.height).toBeCloseTo(520 / 480, 2);
    expect(SHIP_SIZE.height + HERO_BOTTOM_PADDING).toBeLessThanOrEqual(HERO_HEIGHT);
  });
});
