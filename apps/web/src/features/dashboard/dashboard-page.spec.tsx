import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axeViolations } from '../../testing/axe';
import { server } from '../../testing/msw';
import { renderRoute } from '../../testing/render-route';

const usd = (cents: number) => ({
  amountMinor: String(cents),
  currency: 'USD',
});
const asOf = '2026-11-14';

// The Mini-ACME figures the API's own tests compute by hand (analytics.e2e-spec.ts).
function answerAnalytics() {
  const asked: URLSearchParams[] = [];
  server.use(
    http.get('/api/v1/analytics/summary', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        asOf,
        reportingCurrency: 'USD',
        headcount: 10,
        annualPayroll: usd(94_253_012),
        medianAnnual: usd(10_187_500),
        bandPositions: { below: 3, within: 6, above: 1, noBand: 0 },
        withinBandShare: 0.6,
        unconvertedCount: 0,
      });
    }),
    http.get('/api/v1/analytics/breakdown', ({ request }) =>
      HttpResponse.json({
        asOf,
        reportingCurrency: 'USD',
        by: new URL(request.url).searchParams.get('by'),
        rows: [
          {
            key: 'GB',
            label: 'United Kingdom',
            headcount: 4,
            annualPayroll: usd(48_500_000),
            p25: usd(10_406_250),
            median: usd(11_562_500),
            p75: usd(13_281_250),
            withinBandShare: 0.5,
            unconvertedCount: 0,
          },
        ],
      }),
    ),
    http.get('/api/v1/analytics/band-positioning', () =>
      HttpResponse.json({
        asOf,
        levels: [{ levelCode: 'IC4', below: 3, within: 4, above: 1 }],
      }),
    ),
    http.get('/api/v1/analytics/pay-gap', () =>
      HttpResponse.json({
        asOf,
        reportingCurrency: 'USD',
        reference: 'male',
        categories: [
          {
            levelCode: 'IC3',
            jobFamily: { code: 'SWE', name: 'Software' },
            femaleCount: 6,
            maleCount: 5,
            suppressed: false,
            meanGap: 0.2139,
            medianGap: 0.1,
          },
          {
            levelCode: 'IC4',
            jobFamily: { code: 'SWE', name: 'Software' },
            femaleCount: 3,
            maleCount: 2,
            suppressed: true,
            meanGap: null,
            medianGap: null,
          },
        ],
      }),
    ),
  );
  return asked;
}

describe('Dashboard', () => {
  beforeAll(async () => {
    await import('./dashboard-page');
  }, 30_000);

  afterEach(() => localStorage.clear());

  it('shows the headline figures, asked for in the reporting currency', async () => {
    const asked = answerAnalytics();
    renderRoute('/');

    const tiles = await screen.findByRole('list', { name: 'Key figures' });

    // The tiles show placeholders until the figures arrive.
    expect(await within(tiles).findByText('10')).toBeInTheDocument();
    expect(within(tiles).getByText('≈ $942,530')).toBeInTheDocument();
    expect(within(tiles).getByText('≈ $101,875')).toBeInTheDocument();
    expect(within(tiles).getByText('60%')).toBeInTheDocument();
    expect(asked[0]?.get('reportingCurrency')).toBe('USD');
  });

  it('splits payroll by country', async () => {
    answerAnalytics();
    renderRoute('/');

    const table = await screen.findByRole('table', {
      name: 'Payroll by country',
    });

    expect(within(table).getByText('United Kingdom')).toBeInTheDocument();
    expect(within(table).getByText('≈ $485,000')).toBeInTheDocument();
  });

  it('shows HR managers the pay gap, and says which groups are too small to show', async () => {
    answerAnalytics();
    renderRoute('/');

    const table = await screen.findByRole('table', {
      name: 'Gender pay gap by level and job family',
    });

    expect(within(table).getByText('21.4%')).toBeInTheDocument();
    expect(within(table).getByText('10.0%')).toBeInTheDocument();
    expect(
      within(table).getByText('Not shown: fewer than 5 on a side'),
    ).toBeInTheDocument();
  });

  it('shows viewers the band counts but no pay gap', async () => {
    localStorage.setItem('paylens.actingRole', 'viewer');
    answerAnalytics();
    renderRoute('/');

    await screen.findByRole('table', { name: 'Band positions by level' });

    expect(
      screen.queryByRole('table', {
        name: 'Gender pay gap by level and job family',
      }),
    ).not.toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    answerAnalytics();
    const { container } = renderRoute('/');
    await screen.findByRole('table', { name: 'Payroll by country' });

    expect(await axeViolations(container)).toEqual([]);
  });
});
