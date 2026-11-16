import { Injectable } from '@nestjs/common';
import {
  annualize,
  bandMetrics,
  divideRoundingHalfEven,
  MEDIAN,
  Money,
  percentileCont,
} from '@paylens/domain';
import type { AnalyticsQuery, AnalyticsSummary } from '@paylens/shared';
import { Clock } from '../common/clock.js';
import { FxRepository } from '../fx/fx.repository.js';
import { AnalyticsRepository } from './analytics.repository.js';

/** Shares are reported to 4 decimals, rounded half-even, like the band ratios. */
const SHARE_SCALE = 10_000n;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analytics: AnalyticsRepository,
    private readonly fx: FxRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Headcount, annual payroll, median and band positions of the active people on `asOf`
   * (analytics.md). Each salary is annualised and converted on its own with the rate valid
   * that day, then summed in minor units, so totals and rows always reconcile. Someone with no
   * rate is counted in `unconvertedCount`, never converted at a guess.
   */
  async summary(query: AnalyticsQuery): Promise<AnalyticsSummary> {
    const asOf = query.asOf ?? this.clock.today();
    const currency = query.reportingCurrency;
    const [rows, fx] = await Promise.all([
      this.analytics.compOn(asOf),
      this.fx.loadTable(),
    ]);

    const amounts: bigint[] = [];
    const positions = { below: 0, within: 0, above: 0, noBand: 0 };
    let unconvertedCount = 0;
    for (const { salary, band } of rows) {
      if (salary === null) {
        continue;
      }
      const annual = annualize(
        Money.of(salary.amountMinor, salary.currency),
        salary.frequency,
      );
      if (band === null || band.currency !== annual.currency) {
        positions.noBand += 1;
      } else {
        const { position } = bandMetrics(annual, {
          min: Money.of(band.minMinor, band.currency),
          mid: Money.of(band.midMinor, band.currency),
          max: Money.of(band.maxMinor, band.currency),
        });
        positions[position] += 1;
      }
      const converted = fx.convert(annual, currency, asOf);
      if (converted.kind === 'converted') {
        amounts.push(converted.money.amountMinor);
      } else {
        unconvertedCount += 1;
      }
    }

    const median = percentileCont(amounts, MEDIAN);
    const banded = positions.below + positions.within + positions.above;
    return {
      asOf,
      reportingCurrency: currency,
      headcount: rows.length,
      annualPayroll: {
        amountMinor: amounts
          .reduce((sum, amount) => sum + amount, 0n)
          .toString(),
        currency,
      },
      medianAnnual:
        median === null ? null : { amountMinor: median.toString(), currency },
      bandPositions: positions,
      withinBandShare:
        banded === 0
          ? null
          : Number(
              divideRoundingHalfEven(
                BigInt(positions.within) * SHARE_SCALE,
                BigInt(banded),
              ),
            ) / Number(SHARE_SCALE),
      unconvertedCount,
    };
  }
}
