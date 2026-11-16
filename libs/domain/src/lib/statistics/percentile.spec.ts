import { MEDIAN, P25, P75, P90, percentileCont } from './percentile.js';

describe('percentileCont', () => {
  it('has no percentile of nothing', () => {
    expect(percentileCont([], MEDIAN)).toBeNull();
  });

  it('takes the middle value of an odd count, whatever the input order', () => {
    expect(percentileCont([5n, 1n, 3n], MEDIAN)).toBe(3n);
  });

  it('handles repeated amounts', () => {
    expect(percentileCont([3n, 1n, 3n], MEDIAN)).toBe(3n);
  });

  it('interpolates between the two middle values, rounding half to even', () => {
    expect(percentileCont([10n, 20n], MEDIAN)).toBe(15n);
    expect(percentileCont([1n, 2n], MEDIAN)).toBe(2n); // 1.5 → 2
    expect(percentileCont([1n, 4n], MEDIAN)).toBe(2n); // 2.5 → 2
  });

  it('interpolates any percentile like Postgres percentile_cont', () => {
    const values = [10n, 20n, 30n, 40n, 50n];

    expect(percentileCont(values, P25)).toBe(20n); // position 1
    expect(percentileCont(values, P75)).toBe(40n); // position 3
    expect(percentileCont(values, P90)).toBe(46n); // position 3.6 → 40 + 0.6 × 10
  });

  it('matches the hand-computed median of Mini-ACME’s active payroll in cents', () => {
    const usdCents = [
      3_433_735n,
      2_168_675n,
      2_650_602n,
      13_000_000n,
      15_000_000n,
      9_500_000n,
      12_500_000n,
      10_625_000n,
      9_750_000n,
      15_625_000n,
    ];

    expect(percentileCont(usdCents, MEDIAN)).toBe(10_187_500n);
  });
});
