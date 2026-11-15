import { sql } from 'drizzle-orm';
import {
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  unique,
} from 'drizzle-orm/pg-core';

// Reference data: small, stable lists that the seed loads and admins rarely change.

export const currencies = pgTable(
  'currencies',
  {
    code: char('code', { length: 3 }).primaryKey(),
    name: text('name').notNull(),
    minorUnits: smallint('minor_units').notNull(),
  },
  (table) => [
    check('currencies_minor_units', sql`${table.minorUnits} between 0 and 4`),
  ],
);

export const countries = pgTable('countries', {
  code: char('code', { length: 2 }).primaryKey(),
  name: text('name').notNull(),
  /** One currency per country (requirements → assumptions). */
  currencyCode: char('currency_code', { length: 3 })
    .notNull()
    .references(() => currencies.code),
  region: text('region').notNull(),
});

export const departments = pgTable('departments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

export const jobFamilies = pgTable('job_families', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

export const jobLevels = pgTable('job_levels', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  /** IC1–IC6, M1–M4 */
  code: text('code').notNull().unique(),
  /** 'ic' or 'manager' */
  track: text('track').notNull(),
  rank: smallint('rank').notNull(),
});

/** On `as_of`, 1 unit of `base_currency` (always USD) = `rate` units of `quote_currency`. */
export const fxRates = pgTable(
  'fx_rates',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    baseCurrency: char('base_currency', { length: 3 })
      .notNull()
      .default('USD')
      .references(() => currencies.code),
    quoteCurrency: char('quote_currency', { length: 3 })
      .notNull()
      .references(() => currencies.code),
    rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
    asOf: date('as_of').notNull(),
    source: text('source').notNull(),
  },
  (table) => [
    unique('fx_rates_one_per_day').on(
      table.baseCurrency,
      table.quoteCurrency,
      table.asOf,
    ),
    check('fx_rates_positive', sql`${table.rate} > 0`),
    check('fx_rates_usd_based', sql`${table.baseCurrency} = 'USD'`),
    // "Latest rate on or before a date" for one currency.
    index('fx_rates_quote_as_of').on(table.quoteCurrency, table.asOf.desc()),
  ],
);
