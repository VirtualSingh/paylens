import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

// Expectations come from the Mini-ACME table in db/testing/mini-acme.ts.
describe('reference data', () => {
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

  const get = (path: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('x-acting-role', 'viewer');

  const money = (amountMinor: number, currency: string) => ({
    amountMinor: String(amountMinor),
    currency,
  });

  describe('lookups', () => {
    it('lists countries by name with their currency, cacheable for an hour', async () => {
      const response = await get('/countries').expect(200);

      expect(response.body).toEqual([
        { code: 'IN', name: 'India', currencyCode: 'INR', region: 'APAC' },
        {
          code: 'GB',
          name: 'United Kingdom',
          currencyCode: 'GBP',
          region: 'EMEA',
        },
        {
          code: 'US',
          name: 'United States',
          currencyCode: 'USD',
          region: 'Americas',
        },
      ]);
      expect(response.headers['cache-control']).toBe('private, max-age=3600');
    });

    it('lists departments and job families by name', async () => {
      const departments = await get('/departments').expect(200);
      const families = await get('/job-families').expect(200);

      expect(departments.body).toEqual([
        { code: 'ENG', name: 'Engineering' },
        { code: 'SAL', name: 'Sales' },
      ]);
      expect(families.body).toEqual([
        { code: 'GTM', name: 'Go-to-market' },
        { code: 'SWE', name: 'Software' },
      ]);
    });

    it('lists job levels by track, then rank', async () => {
      const response = await get('/job-levels').expect(200);

      expect(response.body).toEqual([
        { code: 'IC3', track: 'ic', rank: 3 },
        { code: 'IC4', track: 'ic', rank: 4 },
        { code: 'M1', track: 'manager', rank: 4 },
      ]);
    });
  });

  describe('GET /pay-bands', () => {
    it('counts the people in a band and its outliers on today’s salaries', async () => {
      // GB IC4: Amelia £100k within, Oliver £85k within, Sophia £78k below, George £125k above.
      const response = await get('/pay-bands?country=GB').expect(200);

      expect(response.body).toEqual([
        {
          id: expect.any(String),
          countryCode: 'GB',
          levelCode: 'IC4',
          min: money(8_000_000, 'GBP'),
          mid: money(10_000_000, 'GBP'),
          max: money(12_000_000, 'GBP'),
          effectiveFrom: '2024-01-01',
          effectiveTo: null,
          employeeCount: 4,
          belowCount: 1,
          aboveCount: 1,
        },
      ]);
    });

    it('leaves out people with no current salary and annualises monthly pay', async () => {
      // US IC4: Emma $130k within, Olivia $95k below; Noah left in 2025 and is not counted.
      // IN IC3: Diya ₹1.5L a month = ₹18L a year, within; Isha ₹26L, above (on leave counts).
      const us = await get('/pay-bands?country=US&level=IC4').expect(200);
      const india = await get('/pay-bands?country=IN&level=IC3').expect(200);

      expect(us.body).toMatchObject([
        { employeeCount: 2, belowCount: 1, aboveCount: 0 },
      ]);
      expect(india.body).toMatchObject([
        { employeeCount: 2, belowCount: 0, aboveCount: 1 },
      ]);
    });

    it('lists every band by country, then level', async () => {
      const response = await get('/pay-bands').expect(200);

      expect(
        response.body.map(
          (band: { countryCode: string; levelCode: string }) =>
            `${band.countryCode} ${band.levelCode}`,
        ),
      ).toEqual(['GB IC4', 'IN IC3', 'IN IC4', 'US IC4', 'US M1']);
    });

    it('shows only the bands in force on the as-of date', async () => {
      const response = await get('/pay-bands?asOf=2023-12-31').expect(200);

      expect(response.body).toEqual([]);
    });

    it('rejects a lower-case country with 400', async () => {
      const response = await get('/pay-bands?country=gb').expect(400);

      expect(response.body.errors[0].path).toBe('country');
    });
  });

  describe('GET /fx-rates', () => {
    it('lists rates newest first, without trailing zeros', async () => {
      const response = await get('/fx-rates').expect(200);

      expect(response.body).toEqual([
        {
          baseCurrency: 'USD',
          quoteCurrency: 'GBP',
          rate: '0.8',
          asOf: '2026-11-01',
          source: 'sample',
        },
        {
          baseCurrency: 'USD',
          quoteCurrency: 'INR',
          rate: '83',
          asOf: '2026-11-01',
          source: 'sample',
        },
        {
          baseCurrency: 'USD',
          quoteCurrency: 'INR',
          rate: '80',
          asOf: '2025-11-01',
          source: 'sample',
        },
      ]);
    });

    it('filters by currency and an inclusive date range', async () => {
      const inr = await get('/fx-rates?quote=INR').expect(200);
      const before2026 = await get('/fx-rates?to=2025-11-01').expect(200);
      const since2026 = await get('/fx-rates?from=2026-01-01').expect(200);

      expect(inr.body).toHaveLength(2);
      expect(before2026.body).toMatchObject([
        { quoteCurrency: 'INR', rate: '80' },
      ]);
      expect(since2026.body).toHaveLength(2);
    });
  });
});
