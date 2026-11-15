import { divideRoundingHalfEven } from './rounding.js';

describe('divideRoundingHalfEven', () => {
  it('returns the exact quotient when there is no remainder', () => {
    expect(divideRoundingHalfEven(120n, 10n)).toBe(12n);
  });

  it.each([
    [14n, 10n, 1n],
    [16n, 10n, 2n],
  ])(
    'rounds %d / %d to the nearest integer, %d',
    (numerator, denominator, quotient) => {
      expect(divideRoundingHalfEven(numerator, denominator)).toBe(quotient);
    },
  );

  it.each([
    [15n, 10n, 2n],
    [25n, 10n, 2n],
    [35n, 10n, 4n],
  ])(
    'rounds an exact half %d / %d to the even neighbour, %d',
    (numerator, denominator, quotient) => {
      expect(divideRoundingHalfEven(numerator, denominator)).toBe(quotient);
    },
  );

  it.each([
    [-15n, 10n, -2n],
    [-25n, 10n, -2n],
    [-16n, 10n, -2n],
    [15n, -10n, -2n],
  ])(
    'rounds negative quotients symmetrically: %d / %d is %d',
    (numerator, denominator, quotient) => {
      expect(divideRoundingHalfEven(numerator, denominator)).toBe(quotient);
    },
  );

  it('refuses to divide by zero', () => {
    expect(() => divideRoundingHalfEven(1n, 0n)).toThrow(RangeError);
  });
});
