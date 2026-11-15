import { sql } from 'drizzle-orm';
import {
  char,
  check,
  date,
  type AnyPgColumn,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { employeeStatus, employmentType, gender } from './enums.js';
import { countries, departments, jobFamilies, jobLevels } from './reference.js';
import { citext } from './types.js';

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** For people and search ("ACME-000421"); URLs use `id`. */
    employeeCode: text('employee_code').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    workEmail: citext('work_email').notNull().unique(),
    countryCode: char('country_code', { length: 2 })
      .notNull()
      .references(() => countries.code),
    departmentId: integer('department_id')
      .notNull()
      .references(() => departments.id),
    jobFamilyId: integer('job_family_id')
      .notNull()
      .references(() => jobFamilies.id),
    jobLevelId: integer('job_level_id')
      .notNull()
      .references(() => jobLevels.id),
    jobTitle: text('job_title').notNull(),
    managerId: uuid('manager_id').references((): AnyPgColumn => employees.id),
    employmentType: employmentType('employment_type').notNull(),
    fte: numeric('fte', { precision: 3, scale: 2 }).notNull(),
    hireDate: date('hire_date').notNull(),
    terminationDate: date('termination_date'),
    status: employeeStatus('status').notNull(),
    gender: gender('gender').notNull(),
    /** Optimistic locking: sent as ETag, required back as If-Match (api.md). */
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('employees_fte', sql`${table.fte} > 0 and ${table.fte} <= 1`),
    check(
      'employees_termination_after_hire',
      sql`${table.terminationDate} is null or ${table.terminationDate} >= ${table.hireDate}`,
    ),
    // Directory filters (country, department, level, status) and "reports to".
    index('employees_status').on(table.status),
    index('employees_country').on(table.countryCode),
    index('employees_department').on(table.departmentId),
    index('employees_level').on(table.jobLevelId),
    index('employees_manager').on(table.managerId),
    // Default directory sort: last name, then first name, case-insensitively.
    index('employees_name_sort').on(
      sql`lower(${table.lastName})`,
      sql`lower(${table.firstName})`,
    ),
    // Free-text search `?q=` over name and code with trigrams (pg_trgm).
    index('employees_search_trgm').using(
      'gin',
      sql`(${table.firstName} || ' ' || ${table.lastName} || ' ' || ${table.employeeCode}) gin_trgm_ops`,
    ),
  ],
);
