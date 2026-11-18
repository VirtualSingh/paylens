import type { BandPositioning, BreakdownRow, MoneyJson } from '@paylens/shared';
import type { ReactNode } from 'react';
import { MoneyText } from '../../components/money';
import { ErrorState } from '../../components/page-states';
import { formatDate } from '../../lib/format';
import { useReportingCurrency } from '../../lib/reporting-currency';
import { useCanManagePay } from '../../lib/session';
import {
  useBandPositioning,
  useBreakdown,
  usePayGap,
  useSummary,
} from './use-analytics';

const percent = (share: number | null) =>
  share === null ? '—' : `${(share * 100).toFixed(0)}%`;
const gapPercent = (gap: number | null) =>
  gap === null ? '—' : `${(gap * 100).toFixed(1)}%`;

/** "How ACME pays people" (ui-screens.md §3): the figures the canonical questions ask for. */
export function DashboardPage() {
  const { currency } = useReportingCurrency();
  const summary = useSummary();
  const canManagePay = useCanManagePay();

  if (summary.isError) {
    return <ErrorState error={summary.error} />;
  }
  const data = summary.data;
  const approx = (money: MoneyJson | null) =>
    money === null || data === undefined ? (
      '—'
    ) : (
      <MoneyText money={money} approximate={{ asOf: data.asOf }} />
    );

  return (
    <div className="flex max-w-[1100px] flex-col gap-8">
      <header>
        <h1 className="text-xl">How ACME pays people</h1>
        <p className="mt-1 text-muted-foreground">
          {data === undefined
            ? 'Loading…'
            : `As of ${formatDate(data.asOf)} · ${currency} · active people only`}
          {data !== undefined && data.unconvertedCount > 0 && (
            <>
              {' '}
              · {data.unconvertedCount} without an exchange rate, left out of
              money figures
            </>
          )}
        </p>
      </header>

      <ul
        aria-label="Key figures"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <Tile
          label="Headcount"
          value={data?.headcount.toLocaleString('en-US') ?? '—'}
        />
        <Tile
          label="Annual payroll"
          value={approx(data?.annualPayroll ?? null)}
        />
        <Tile
          label="Median salary"
          value={approx(data?.medianAnnual ?? null)}
        />
        <Tile
          label="Within band"
          value={percent(data?.withinBandShare ?? null)}
          context={
            data === undefined
              ? undefined
              : `${data.bandPositions.below} below · ${data.bandPositions.above} above`
          }
        />
      </ul>

      <BandPositions />
      <BreakdownTable by="country" title="Payroll by country" />
      <BreakdownTable by="level" title="Salary by level" />
      {canManagePay && <PayGapTable />}
    </div>
  );
}

function Tile({
  label,
  value,
  context,
}: {
  label: string;
  value: ReactNode;
  context?: string;
}) {
  return (
    <li className="flex flex-col gap-1 border-l-2 border-line pl-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl tabular-nums">{value}</span>
      {context !== undefined && (
        <span className="text-sm text-muted-foreground">{context}</span>
      )}
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-md">{title}</h2>
      {children}
    </section>
  );
}

const th = 'h-9 px-3 font-medium text-muted-foreground';

/** Per level: a bar split below / within / above (colour and the counts beside it). */
function BandPositions() {
  const positioning = useBandPositioning();
  if (positioning.data === undefined) {
    return null;
  }
  const levels: BandPositioning['levels'] = positioning.data.levels;
  return (
    <Section title="Where people sit in their bands">
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">Band positions by level</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={th}>
              Level
            </th>
            <th scope="col" className={th}>
              <span className="sr-only">Distribution</span>
            </th>
            <th scope="col" className={`${th} text-right`}>
              Below
            </th>
            <th scope="col" className={`${th} text-right`}>
              Within
            </th>
            <th scope="col" className={`${th} text-right`}>
              Above
            </th>
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => {
            const total = level.below + level.within + level.above || 1;
            return (
              <tr key={level.levelCode} className="h-9 border-b border-line">
                <td className="px-3">{level.levelCode}</td>
                <td className="w-1/2 px-3" aria-hidden="true">
                  <div className="flex h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-below"
                      style={{ width: `${(level.below / total) * 100}%` }}
                    />
                    <div
                      className="bg-teal"
                      style={{ width: `${(level.within / total) * 100}%` }}
                    />
                    <div
                      className="bg-above"
                      style={{ width: `${(level.above / total) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 text-right tabular-nums">{level.below}</td>
                <td className="px-3 text-right tabular-nums">{level.within}</td>
                <td className="px-3 text-right tabular-nums">{level.above}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

function BreakdownTable({
  by,
  title,
}: {
  by: 'country' | 'level';
  title: string;
}) {
  const breakdown = useBreakdown(by);
  if (breakdown.data === undefined) {
    return null;
  }
  const { asOf } = breakdown.data;
  const money = (value: MoneyJson | null) =>
    value === null ? '—' : <MoneyText money={value} approximate={{ asOf }} />;
  return (
    <Section title={title}>
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={th}>
              {by === 'country' ? 'Country' : 'Level'}
            </th>
            <th scope="col" className={`${th} text-right`}>
              People
            </th>
            <th scope="col" className={`${th} text-right`}>
              Annual payroll
            </th>
            <th scope="col" className={`${th} text-right`}>
              p25
            </th>
            <th scope="col" className={`${th} text-right`}>
              Median
            </th>
            <th scope="col" className={`${th} text-right`}>
              p75
            </th>
            <th scope="col" className={`${th} text-right`}>
              Within band
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.data.rows.map((row: BreakdownRow) => (
            <tr key={row.key} className="h-9 border-b border-line">
              <td className="px-3">{row.label}</td>
              <td className="px-3 text-right tabular-nums">{row.headcount}</td>
              <td className="px-3 text-right">{money(row.annualPayroll)}</td>
              <td className="px-3 text-right">{money(row.p25)}</td>
              <td className="px-3 text-right">{money(row.median)}</td>
              <td className="px-3 text-right">{money(row.p75)}</td>
              <td className="px-3 text-right tabular-nums">
                {percent(row.withinBandShare)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

/** HR managers and admins: women's pay against men's per level × job family. */
function PayGapTable() {
  const payGap = usePayGap(true);
  if (payGap.data === undefined) {
    return null;
  }
  return (
    <Section title="Gender pay gap">
      <p className="text-sm text-muted-foreground">
        (Men − women) ÷ men, within the same level and job family. A positive
        gap means women are paid less. Groups with fewer than 5 on a side are
        not shown.
      </p>
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">
          Gender pay gap by level and job family
        </caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={th}>
              Level · job family
            </th>
            <th scope="col" className={`${th} text-right`}>
              Women
            </th>
            <th scope="col" className={`${th} text-right`}>
              Men
            </th>
            <th scope="col" className={`${th} text-right`}>
              Mean gap
            </th>
            <th scope="col" className={`${th} text-right`}>
              Median gap
            </th>
          </tr>
        </thead>
        <tbody>
          {payGap.data.categories.map((category) => (
            <tr
              key={`${category.levelCode}-${category.jobFamily.code}`}
              className="h-9 border-b border-line"
            >
              <td className="px-3">
                {category.levelCode} · {category.jobFamily.name}
              </td>
              <td className="px-3 text-right tabular-nums">
                {category.femaleCount}
              </td>
              <td className="px-3 text-right tabular-nums">
                {category.maleCount}
              </td>
              {category.suppressed ? (
                <td
                  colSpan={2}
                  className="px-3 text-right text-muted-foreground"
                >
                  Not shown: fewer than 5 on a side
                </td>
              ) : (
                <>
                  <td className="px-3 text-right tabular-nums">
                    {gapPercent(category.meanGap)}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {gapPercent(category.medianGap)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
