import { annualize, Money } from '@paylens/domain';
import type { MoneyJson, SalaryRecordJson } from '@paylens/shared';
import { lazy, Suspense, useMemo } from 'react';
import type { ChartOption } from '../../components/echart';
import { formatMoney } from '../../components/money';
import { formatDate } from '../../lib/format';

const EChart = lazy(() => import('../../components/echart'));

const CHART_HEIGHT = 200;

export interface HistoryPoint {
  readonly date: string;
  readonly annual: MoneyJson;
}

/**
 * The history as points on a line, oldest first, annualised so monthly and annual records
 * compare. A record a correction superseded (closed on its own first day, ADR-005) is left
 * out: it never applied.
 */
export function historyPoints(
  records: readonly SalaryRecordJson[],
): HistoryPoint[] {
  return records
    .filter((record) => record.effectiveTo !== record.effectiveFrom)
    .toSorted(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map((record) => {
      const annual = annualize(
        Money.of(BigInt(record.salary.amountMinor), record.salary.currency),
        record.frequency,
      );
      return {
        date: record.effectiveFrom,
        annual: {
          amountMinor: annual.amountMinor.toString(),
          currency: annual.currency,
        },
      };
    });
}

/** The chart in one sentence, for people who cannot see it. */
export function historySummary(records: readonly SalaryRecordJson[]): string {
  const points = historyPoints(records);
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) {
    return 'No salary recorded.';
  }
  if (points.length === 1) {
    return `Annual salary ${formatMoney(first.annual)} since ${formatDate(first.date)}.`;
  }
  return `Annual salary from ${formatMoney(first.annual)} on ${formatDate(first.date)} to ${formatMoney(last.annual)} on ${formatDate(last.date)}, over ${points.length} salaries.`;
}

/** A step line: each salary holds until the next one starts, and the last until today. */
function chartOption(points: readonly HistoryPoint[]): ChartOption {
  const currency = points[0]?.annual.currency ?? 'USD';
  // Chart geometry only: plotting needs numbers; the figures shown come from formatMoney.
  const value = (money: MoneyJson) =>
    Number(
      Money.of(BigInt(money.amountMinor), money.currency).toDecimalString(),
    );
  const last = points.at(-1);
  const data = [
    ...points.map((point) => [point.date, value(point.annual)]),
    ...(last === undefined
      ? []
      : [[new Date().toISOString().slice(0, 10), value(last.annual)]]),
  ];
  const compact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
  });
  return {
    grid: { left: 64, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#1B2A41' } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { formatter: (amount: number) => compact.format(amount) },
      splitLine: { lineStyle: { color: '#D9E1DF' } },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (amount: unknown) =>
        typeof amount === 'number' ? compact.format(amount) : '',
    },
    series: [
      {
        type: 'line',
        step: 'end',
        data,
        symbolSize: 6,
        lineStyle: { color: '#157A6E', width: 2 },
        itemStyle: { color: '#157A6E' },
      },
    ],
  };
}

export function SalaryHistoryChart({
  records,
}: {
  records: readonly SalaryRecordJson[];
}) {
  const option = useMemo(() => chartOption(historyPoints(records)), [records]);
  return (
    <figure className="flex flex-col gap-1">
      <Suspense fallback={<div style={{ height: CHART_HEIGHT }} />}>
        <EChart option={option} height={CHART_HEIGHT} />
      </Suspense>
      <figcaption className="text-sm text-muted-foreground">
        {historySummary(records)}
      </figcaption>
    </figure>
  );
}
