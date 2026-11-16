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

/*
 * Band positions of the active people, by level (penetration = (annual − min) ÷ (max − min)):
 *   IC3: Sharma 0.25 within
 *   IC4: Mehta 0.375, Gupta −0.1667 below, Johnson 0.6, Brown −0.1 below, Wilson 0.5,
 *        Taylor 0.125, Clarke −0.05 below, Evans 1.125 above
 *   M1:  Smith 0.6786 within
 */
describe('GET /api/v1/analytics/band-positioning', () => {
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

  const positioning = (role: string) =>
    request(app.getHttpServer())
      .get('/api/v1/analytics/band-positioning')
      .set('x-acting-role', role)
      .expect(200);

  it('gives HR managers one point per person, by code, per level in ladder order', async () => {
    const response = await positioning('hr_manager');

    const ic4 = response.body.levels.find(
      (level: { levelCode: string }) => level.levelCode === 'IC4',
    );
    expect(
      response.body.levels.map(
        (level: { levelCode: string }) => level.levelCode,
      ),
    ).toEqual(['IC3', 'IC4', 'M1']);
    expect(ic4).toMatchObject({ below: 3, within: 4, above: 1 });
    expect(ic4.points).toContainEqual({
      employeeCode: 'ACME-000012',
      penetration: 1.125,
      position: 'above',
    });
    expect(ic4.points).toContainEqual({
      employeeCode: 'ACME-000003',
      penetration: -0.1667,
      position: 'below',
    });
  });

  it('gives viewers the counts, without anyone’s point', async () => {
    const response = await positioning('viewer');

    expect(response.body.levels).toEqual([
      { levelCode: 'IC3', below: 0, within: 1, above: 0 },
      { levelCode: 'IC4', below: 3, within: 4, above: 1 },
      { levelCode: 'M1', below: 0, within: 1, above: 0 },
    ]);
  });
});

describe('GET /api/v1/analytics/pay-gap', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    // Five men at $100k and five women at $90k, IC3 Software, US: enough people to compare.
    await pglite.exec(`
      insert into employees (employee_code, first_name, last_name, work_email, country_code,
        department_id, job_family_id, job_level_id, job_title, employment_type, fte, hire_date,
        status, gender)
      select 'GAP-' || x.g || '-' || i, 'Gap', 'Person ' || i, 'gap.' || x.g || i || '@acme.test',
             'US', d.id, f.id, l.id, 'Engineer', 'full_time', 1, '2024-01-01', 'active',
             x.g::gender
      from generate_series(1, 5) as i
      cross join (values ('male'), ('female')) as x(g)
      join departments d on d.code = 'ENG'
      join job_families f on f.code = 'SWE'
      join job_levels l on l.code = 'IC3';
      insert into salary_records (employee_id, amount_minor, currency_code, pay_frequency,
        effective_from, reason)
      select id, case when gender = 'male' then 10000000 else 9000000 end, 'USD', 'annual',
             '2024-01-01', 'hire'
      from employees where employee_code like 'GAP-%';
    `);
    app = await createTestApp({
      database: drizzle(pglite),
      today: '2026-11-14',
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  const payGap = (role = 'hr_manager') =>
    request(app.getHttpServer())
      .get('/api/v1/analytics/pay-gap')
      .set('x-acting-role', role);

  it('compares women with men per level and job family, on mean and median', async () => {
    // IC3 Software: men 5 × $100k; women 5 × $90k plus Diya Sharma ($21,686.75).
    // Median gap (100k − 90k) / 100k = 0.1; mean gap 64,156,625 / 300,000,000 = 0.2139.
    const response = await payGap().expect(200);

    expect(response.body.reference).toBe('male');
    expect(response.body.categories).toContainEqual({
      levelCode: 'IC3',
      jobFamily: { code: 'SWE', name: 'Software' },
      femaleCount: 6,
      maleCount: 5,
      suppressed: false,
      meanGap: 0.2139,
      medianGap: 0.1,
    });
  });

  it('stays silent where either side has fewer than five people', async () => {
    const response = await payGap().expect(200);

    expect(response.body.categories).toContainEqual({
      levelCode: 'IC4',
      jobFamily: { code: 'SWE', name: 'Software' },
      femaleCount: 3,
      maleCount: 2,
      suppressed: true,
      meanGap: null,
      medianGap: null,
    });
  });

  it('is for HR managers: gender is not for viewers', async () => {
    await payGap('viewer').expect(403);
  });
});
