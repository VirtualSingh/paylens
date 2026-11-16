import { payGap } from './pay-gap.js';

const times = (value: bigint, count: number) =>
  Array.from({ length: count }, () => value);

describe('payGap', () => {
  it('is how much less the group earns than the reference, as a share of the reference', () => {
    expect(payGap(times(100n, 5), times(90n, 5))).toEqual({
      suppressed: false,
      meanGap: 0.1,
      medianGap: 0.1,
    });
  });

  it('is negative when the group earns more', () => {
    expect(payGap(times(100n, 5), times(110n, 5))).toMatchObject({
      meanGap: -0.1,
      medianGap: -0.1,
    });
  });

  it('can differ between mean and median', () => {
    // Reference mean 300, median 300; group mean 300, median 200 → 0 and (300 − 200) / 300.
    expect(
      payGap([100n, 200n, 300n, 400n, 500n], [100n, 100n, 200n, 200n, 900n]),
    ).toEqual({ suppressed: false, meanGap: 0, medianGap: 0.3333 });
  });

  it('gives no gap when the reference earns nothing (no division by zero)', () => {
    expect(payGap(times(0n, 5), times(0n, 5))).toEqual({
      suppressed: false,
      meanGap: null,
      medianGap: null,
    });
  });

  it.each([
    ['the reference has fewer than five people', times(100n, 4), times(90n, 5)],
    ['the group has fewer than five people', times(100n, 5), times(90n, 4)],
  ])(
    'stays silent when %s, so nobody can be singled out',
    (_case, reference, group) => {
      expect(payGap(reference, group)).toEqual({
        suppressed: true,
        meanGap: null,
        medianGap: null,
      });
    },
  );
});
