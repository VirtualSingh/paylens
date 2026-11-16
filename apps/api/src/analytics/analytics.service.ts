import { Injectable } from '@nestjs/common';
import {
  annualize,
  type BandPosition,
  bandMetrics,
  divideRoundingHalfEven,
  type FxTable,
  type IsoDate,
  MEDIAN,
  Money,
  P25,
  P75,
  percentileCont,
} from '@paylens/domain';
import type {
  AnalyticsBreakdown,
  AnalyticsBreakdownQuery,
  AnalyticsQuery,
  AnalyticsSummary,
  BreakdownRow,
  MoneyJson,
} from '@paylens/shared';
import { Clock } from '../common/clock.js';
import { FxRepository } from '../fx/fx.repository.js';
import { AnalyticsRepository, type CompRow } from './analytics.repository.js';

/** Shares are reported to 4 decimals, rounded half-even, like the band ratios. */
const SHARE_SCALE = 10_000n;

/** One person, measured once: their pay in the reporting currency and their band position. */
interface Measured {
  readonly row: CompRow;
  /** Minor units of the reporting currency; null with no salary or no FX rate. */
  readonly reporting: bigint | null;
  /** null with no salary on the date. */
  readonly position: BandPosition | 'noBand' | null;
  readonly unconverted: boolean;
}

/** What every group reports, summary and breakdown alike. */
interface Aggregate {
  readonly headcount: number;
  readonly payroll: bigint;
  readonly p25: bigint | null;
  readonly median: bigint | null;
  readonly p75: bigint | null;
  readonly positions: {
    below: number;
    within: number;
    above: number;
    noBand: number;
  };
  readonly withinBandShare: number | null;
  readonly unconvertedCount: number;
}

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
    const { asOf, measured } = await this.measure(query);
    const all = aggregate(measured);
    const currency = query.reportingCurrency;
    return {
      asOf,
      reportingCurrency: currency,
      headcount: all.headcount,
      annualPayroll: money(all.payroll, currency),
      medianAnnual: maybeMoney(all.median, currency),
      bandPositions: all.positions,
      withinBandShare: all.withinBandShare,
      unconvertedCount: all.unconvertedCount,
    };
  }

  /** The same figures per country, department or level (canonical questions 2, 4 and 7). */
  async breakdown(query: AnalyticsBreakdownQuery): Promise<AnalyticsBreakdown> {
    const { asOf, measured } = await this.measure(query);
    const currency = query.reportingCurrency;
    const groups = new Map<
      string,
      { label: string; order: number; members: Measured[] }
    >();
    for (const person of measured) {
      const group = person.row[query.by];
      const order = 'order' in group ? group.order : 0;
      const existing = groups.get(group.key);
      if (existing === undefined) {
        groups.set(group.key, {
          label: group.label,
          order,
          members: [person],
        });
      } else {
        existing.members.push(person);
      }
    }

    const rows = [...groups.entries()].map(([key, group]) => {
      const figures = aggregate(group.members);
      const row: BreakdownRow = {
        key,
        label: group.label,
        headcount: figures.headcount,
        annualPayroll: money(figures.payroll, currency),
        p25: maybeMoney(figures.p25, currency),
        median: maybeMoney(figures.median, currency),
        p75: maybeMoney(figures.p75, currency),
        withinBandShare: figures.withinBandShare,
        unconvertedCount: figures.unconvertedCount,
      };
      return { row, order: group.order, payroll: figures.payroll };
    });
    // Levels read best in ladder order; everything else, largest payroll first.
    rows.sort((a, b) =>
      query.by === 'level'
        ? a.order - b.order || a.row.key.localeCompare(b.row.key)
        : a.payroll === b.payroll
          ? a.row.key.localeCompare(b.row.key)
          : a.payroll > b.payroll
            ? -1
            : 1,
    );
    return {
      asOf,
      reportingCurrency: currency,
      by: query.by,
      rows: rows.map(({ row }) => row),
    };
  }

  private async measure(
    query: AnalyticsQuery,
  ): Promise<{ asOf: IsoDate; measured: Measured[] }> {
    const asOf = query.asOf ?? this.clock.today();
    const [rows, fx] = await Promise.all([
      this.analytics.compOn(asOf),
      this.fx.loadTable(),
    ]);
    return {
      asOf,
      measured: rows.map((row) =>
        measureOne(row, fx, query.reportingCurrency, asOf),
      ),
    };
  }
}

function measureOne(
  row: CompRow,
  fx: FxTable,
  currency: string,
  asOf: IsoDate,
): Measured {
  const { salary, band } = row;
  if (salary === null) {
    return { row, reporting: null, position: null, unconverted: false };
  }
  const annual = annualize(
    Money.of(salary.amountMinor, salary.currency),
    salary.frequency,
  );
  const position =
    band === null || band.currency !== annual.currency
      ? 'noBand'
      : bandMetrics(annual, {
          min: Money.of(band.minMinor, band.currency),
          mid: Money.of(band.midMinor, band.currency),
          max: Money.of(band.maxMinor, band.currency),
        }).position;
  const converted = fx.convert(annual, currency, asOf);
  return converted.kind === 'converted'
    ? {
        row,
        reporting: converted.money.amountMinor,
        position,
        unconverted: false,
      }
    : { row, reporting: null, position, unconverted: true };
}

function aggregate(members: readonly Measured[]): Aggregate {
  const amounts = members.flatMap((m) =>
    m.reporting === null ? [] : [m.reporting],
  );
  const positions = { below: 0, within: 0, above: 0, noBand: 0 };
  for (const { position } of members) {
    if (position !== null) {
      positions[position] += 1;
    }
  }
  const banded = positions.below + positions.within + positions.above;
  return {
    headcount: members.length,
    payroll: amounts.reduce((sum, amount) => sum + amount, 0n),
    p25: percentileCont(amounts, P25),
    median: percentileCont(amounts, MEDIAN),
    p75: percentileCont(amounts, P75),
    positions,
    withinBandShare:
      banded === 0
        ? null
        : Number(
            divideRoundingHalfEven(
              BigInt(positions.within) * SHARE_SCALE,
              BigInt(banded),
            ),
          ) / Number(SHARE_SCALE),
    unconvertedCount: members.filter((m) => m.unconverted).length,
  };
}

function money(amountMinor: bigint, currency: string): MoneyJson {
  return { amountMinor: amountMinor.toString(), currency };
}

function maybeMoney(
  amountMinor: bigint | null,
  currency: string,
): MoneyJson | null {
  return amountMinor === null ? null : money(amountMinor, currency);
}
