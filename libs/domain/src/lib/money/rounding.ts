/**
 * Integer division rounded to the nearest integer, with exact halves going to the even
 * neighbour ("banker's rounding", ADR-004). Unlike always rounding halves up, it has no
 * upward bias when many converted rows are summed.
 */
export function divideRoundingHalfEven(
  numerator: bigint,
  denominator: bigint,
): bigint {
  if (denominator === 0n) {
    throw new RangeError('Division by zero');
  }
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;

  const quotient = n / d;
  const twiceRemainder = (n % d) * 2n;
  const roundsUp =
    twiceRemainder > d || (twiceRemainder === d && quotient % 2n === 1n);
  const magnitude = roundsUp ? quotient + 1n : quotient;

  return negative ? -magnitude : magnitude;
}
