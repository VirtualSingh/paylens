import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { AnalyticsSummarySchema } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

/*
 * Hand-computed from the Mini-ACME table (db/testing/mini-acme.ts), today = 2026-11-14.
 * Active: 10 people (Isha Patel is on leave, Noah Davis has left). In USD cents, each
 * converted on its own and rounded half-even (1 USD = 83 INR = 0.80 GBP):
 *   Mehta 3,433,735 · Sharma 2,168,675 · Gupta 2,650,602 · Johnson 13,000,000
 *   Smith 15,000,000 · Brown 9,500,000 · Wilson 12,500,000 · Taylor 10,625,000
 *   Clarke 9,750,000 · Evans 15,625,000
 * Total 94,253,012 ($942,530.12). Median: (9,750,000 + 10,625,000) / 2 = 10,187,500.
 * Bands: below Gupta, Brown, Clarke; above Evans; the other six within → 0.6.
 */
describe('GET /api/v1/analytics/summary', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      today: '2026-11-14',
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  const summary = (query = '', role = 'viewer') =>
    request(app.getHttpServer())
      .get(`/api/v1/analytics/summary${query}`)
      .set('x-acting-role', role);

  it('adds up today’s active payroll in USD, person by person', async () => {
    const response = await summary().expect(200);

    expect(AnalyticsSummarySchema.parse(response.body)).toEqual({
      asOf: '2026-11-14',
      reportingCurrency: 'USD',
      headcount: 10,
      annualPayroll: { amountMinor: '94253012', currency: 'USD' },
      medianAnnual: { amountMinor: '10187500', currency: 'USD' },
      bandPositions: { below: 3, within: 6, above: 1, noBand: 0 },
      withinBandShare: 0.6,
      unconvertedCount: 0,
    });
  });

  it('counts people it cannot convert instead of guessing a rate', async () => {
    const response = await summary('?reportingCurrency=EUR').expect(200);

    expect(response.body).toMatchObject({
      headcount: 10,
      annualPayroll: { amountMinor: '0', currency: 'EUR' },
      medianAnnual: null,
      unconvertedCount: 10,
      bandPositions: { below: 3, within: 6, above: 1, noBand: 0 },
    });
  });

  it('uses the salaries and FX rates valid on a past date', async () => {
    // 2025-12-31: INR at its older rate of 80; no GBP rate existed yet (UK people left out).
    // 2,850,000 + 1,800,000 + 2,200,000 rupees / 80 + $130k + $150k + $95k = $460,625.00
    const response = await summary('?asOf=2025-12-31').expect(200);

    expect(response.body).toMatchObject({
      asOf: '2025-12-31',
      annualPayroll: { amountMinor: '46062500', currency: 'USD' },
      unconvertedCount: 4,
    });
  });

  it('is an aggregate, so viewers may read it', async () => {
    await summary('', 'viewer').expect(200);
  });
});

/*
 * By country, USD cents, sorted inside each country (percentile_cont, rounded half-even):
 *   GB 9,750,000 · 10,625,000 · 12,500,000 · 15,625,000 → p25 10,406,250 (position 0.75),
 *      median 11,562,500, p75 13,281,250 (position 2.25); within 2 of 4
 *   US 9,500,000 · 13,000,000 · 15,000,000 → p25 11,250,000, median 13,000,000, p75 14,000,000
 *   IN 2,168,675 · 2,650,602 · 3,433,735 → p25 2,409,638 (…638.5 → even), median 2,650,602,
 *      p75 3,042,168 (…168.5 → even); within 2 of 3
 */
describe('GET /api/v1/analytics/breakdown', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      today: '2026-11-14',
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  const usd = (cents: number) => ({
    amountMinor: String(cents),
    currency: 'USD',
  });

  it('splits payroll by country, largest first, with quartiles and band share', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/breakdown?by=country')
      .set('x-acting-role', 'viewer')
      .expect(200);

    expect(response.body).toMatchObject({
      by: 'country',
      reportingCurrency: 'USD',
    });
    expect(response.body.rows).toEqual([
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
      {
        key: 'US',
        label: 'United States',
        headcount: 3,
        annualPayroll: usd(37_500_000),
        p25: usd(11_250_000),
        median: usd(13_000_000),
        p75: usd(14_000_000),
        withinBandShare: 0.6667,
        unconvertedCount: 0,
      },
      {
        key: 'IN',
        label: 'India',
        headcount: 3,
        annualPayroll: usd(8_253_012),
        p25: usd(2_409_638),
        median: usd(2_650_602),
        p75: usd(3_042_168),
        withinBandShare: 0.6667,
        unconvertedCount: 0,
      },
    ]);
  });

  it('lists levels in ladder order rather than by payroll', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/breakdown?by=level')
      .set('x-acting-role', 'viewer')
      .expect(200);

    expect(
      response.body.rows.map((row: { key: string; headcount: number }) => [
        row.key,
        row.headcount,
      ]),
    ).toEqual([
      ['IC3', 1],
      ['IC4', 8],
      ['M1', 1],
    ]);
  });

  it('refuses a dimension it does not know', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/analytics/breakdown?by=salary')
      .set('x-acting-role', 'viewer')
      .expect(400);
  });
});
