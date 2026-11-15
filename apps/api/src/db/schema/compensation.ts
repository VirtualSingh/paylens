import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.js';
import { payFrequency, salaryReason } from './enums.js';
import { countries, currencies, jobLevels } from './reference.js';
import { users } from './users.js';

/**
 * Effective-dated salary history (ADR-005): valid on [effective_from, effective_to).
 * Append-only except closing `effective_to`; no overlaps per employee. Both rules live in
 * migration SQL (exclusion constraint, trigger) because Drizzle cannot express them.
 */
export const salaryRecords = pgTable(
  'salary_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    /** Integer minor units (ADR-004); never a float. */
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currencyCode: char('currency_code', { length: 3 })
      .notNull()
      .references(() => currencies.code),
    payFrequency: payFrequency('pay_frequency').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    reason: salaryReason('reason').notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('salary_records_positive', sql`${table.amountMinor} > 0`),
    // `=` is allowed: a superseded record closed at its own start (ADR-005 note).
    check(
      'salary_records_period',
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    // An employee's history, newest first (profile timeline, planning a change).
    index('salary_records_history').on(
      table.employeeId,
      table.effectiveFrom.desc(),
    ),
    // The open record per employee (current salary lookup).
    index('salary_records_open')
      .on(table.employeeId)
      .where(sql`${table.effectiveTo} is null`),
  ],
);

/** Salary range for a level in a country, annual, local currency, effective-dated. */
export const payBands = pgTable(
  'pay_bands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobLevelId: integer('job_level_id')
      .notNull()
      .references(() => jobLevels.id),
    countryCode: char('country_code', { length: 2 })
      .notNull()
      .references(() => countries.code),
    currencyCode: char('currency_code', { length: 3 })
      .notNull()
      .references(() => currencies.code),
    minMinor: bigint('min_minor', { mode: 'bigint' }).notNull(),
    midMinor: bigint('mid_minor', { mode: 'bigint' }).notNull(),
    maxMinor: bigint('max_minor', { mode: 'bigint' }).notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Same rule as bandMetrics in libs/domain: min ≤ mid ≤ max, min below max.
    check(
      'pay_bands_ordered',
      sql`${table.minMinor} > 0 and ${table.minMinor} <= ${table.midMinor} and ${table.midMinor} <= ${table.maxMinor} and ${table.minMinor} < ${table.maxMinor}`,
    ),
    check(
      'pay_bands_period',
      sql`${table.effectiveTo} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    // "The band for this level and country on a date".
    index('pay_bands_lookup').on(
      table.jobLevelId,
      table.countryCode,
      table.effectiveFrom.desc(),
    ),
  ],
);
