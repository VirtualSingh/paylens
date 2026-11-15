import type { PGlite } from '@electric-sql/pglite';

/**
 * "Mini-ACME": 12 employees whose figures can be checked by hand (testing.md).
 * FX (latest on or before today): 1 USD = 83 INR = 0.80 GBP (an older INR rate of 80 must lose).
 * Bands (annual, open since 2024-01-01):
 *   IC4 IN ₹24L/30L/36L · IC3 IN ₹16L/20L/24L · IC4 US $100k/125k/150k · M1 US $112k/140k/168k
 *   IC4 GB £80k/100k/120k
 *
 * | #  | name           | ctry | dept | lvl | current salary      | annual (local) | ≈ USD        | compa  | band   |
 * |----|----------------|------|------|-----|---------------------|----------------|--------------|--------|--------|
 * |  1 | Aarav Mehta    | IN   | ENG  | IC4 | ₹28,50,000 / year   | ₹28,50,000     | 34,337.35    | 0.95   | within |
 * |  2 | Diya Sharma    | IN   | ENG  | IC3 | ₹1,50,000 / month   | ₹18,00,000     | 21,686.75    | 0.9    | within |
 * |  3 | Rohan Gupta    | IN   | SAL  | IC4 | ₹22,00,000 / year   | ₹22,00,000     | 26,506.02    | 0.7333 | below  |
 * |  4 | Isha Patel     | IN   | SAL  | IC3 | ₹26,00,000 / year   | ₹26,00,000     | 31,325.30    | 1.3    | above  | on leave
 * |  5 | Emma Johnson   | US   | ENG  | IC4 | $130,000            | $130,000       | 130,000.00   | 1.04   | within | reports to #6
 * |  6 | Liam Smith     | US   | ENG  | M1  | $150,000            | $150,000       | 150,000.00   | 1.0714 | within |
 * |  7 | Olivia Brown   | US   | SAL  | IC4 | $95,000             | $95,000        | 95,000.00    | 0.76   | below  | reports to #6
 * |  8 | Noah Davis     | US   | SAL  | IC4 | none (left 2025)    | —              | —            | —      | —      | terminated
 * |  9 | Amelia Wilson  | GB   | ENG  | IC4 | £100,000            | £100,000       | 125,000.00   | 1      | within |
 * | 10 | Oliver Taylor  | GB   | SAL  | IC4 | £85,000             | £85,000        | 106,250.00   | 0.85   | within |
 * | 11 | Sophia Clarke  | GB   | ENG  | IC4 | £78,000             | £78,000        | 97,500.00    | 0.78   | below  |
 * | 12 | George Evans   | GB   | ENG  | IC4 | £125,000            | £125,000       | 156,250.00   | 1.25   | above  |
 */
export async function seedMiniAcme(db: PGlite): Promise<void> {
  await db.exec(`
    insert into currencies (code, name, minor_units) values
      ('USD', 'US dollar', 2), ('INR', 'Indian rupee', 2), ('GBP', 'Pound sterling', 2);
    insert into countries (code, name, currency_code, region) values
      ('US', 'United States', 'USD', 'Americas'), ('IN', 'India', 'INR', 'APAC'),
      ('GB', 'United Kingdom', 'GBP', 'EMEA');
    insert into departments (code, name) values ('ENG', 'Engineering'), ('SAL', 'Sales');
    insert into job_families (code, name) values ('SWE', 'Software'), ('GTM', 'Go-to-market');
    insert into job_levels (code, track, rank) values ('IC3', 'ic', 3), ('IC4', 'ic', 4), ('M1', 'manager', 4);
    insert into fx_rates (quote_currency, rate, as_of, source) values
      ('INR', 80, '2025-11-01', 'sample'), ('INR', 83, '2026-11-01', 'sample'),
      ('GBP', 0.8, '2026-11-01', 'sample');

    insert into pay_bands (job_level_id, country_code, currency_code, min_minor, mid_minor, max_minor, effective_from)
    select l.id, b.country, b.currency, b.min_minor, b.mid_minor, b.max_minor, '2024-01-01'
    from (values
      ('IC4', 'IN', 'INR', 240000000, 300000000, 360000000),
      ('IC3', 'IN', 'INR', 160000000, 200000000, 240000000),
      ('IC4', 'US', 'USD', 10000000, 12500000, 15000000),
      ('M1',  'US', 'USD', 11200000, 14000000, 16800000),
      ('IC4', 'GB', 'GBP', 8000000, 10000000, 12000000)
    ) as b(level, country, currency, min_minor, mid_minor, max_minor)
    join job_levels l on l.code = b.level;

    insert into employees (employee_code, first_name, last_name, work_email, country_code,
      department_id, job_family_id, job_level_id, job_title, employment_type, fte, hire_date,
      termination_date, status, gender)
    select e.code, e.first_name, e.last_name, e.email, e.country, d.id, f.id, l.id, e.title,
           'full_time', 1, e.hired::date, e.terminated::date, e.status::employee_status,
           e.gender::gender
    from (values
      ('ACME-000001', 'Aarav', 'Mehta', 'aarav.mehta@acme.test', 'IN', 'ENG', 'SWE', 'IC4', 'Software Engineer', '2019-03-12', null, 'active', 'male'),
      ('ACME-000002', 'Diya', 'Sharma', 'diya.sharma@acme.test', 'IN', 'ENG', 'SWE', 'IC3', 'Software Engineer', '2021-06-01', null, 'active', 'female'),
      ('ACME-000003', 'Rohan', 'Gupta', 'rohan.gupta@acme.test', 'IN', 'SAL', 'GTM', 'IC4', 'Account Executive', '2020-01-15', null, 'active', 'male'),
      ('ACME-000004', 'Isha', 'Patel', 'isha.patel@acme.test', 'IN', 'SAL', 'GTM', 'IC3', 'Sales Development Rep', '2022-09-01', null, 'on_leave', 'female'),
      ('ACME-000005', 'Emma', 'Johnson', 'emma.johnson@acme.test', 'US', 'ENG', 'SWE', 'IC4', 'Software Engineer', '2018-05-20', null, 'active', 'female'),
      ('ACME-000006', 'Liam', 'Smith', 'liam.smith@acme.test', 'US', 'ENG', 'SWE', 'M1', 'Engineering Manager', '2016-02-01', null, 'active', 'male'),
      ('ACME-000007', 'Olivia', 'Brown', 'olivia.brown@acme.test', 'US', 'SAL', 'GTM', 'IC4', 'Account Executive', '2023-03-01', null, 'active', 'female'),
      ('ACME-000008', 'Noah', 'Davis', 'noah.davis@acme.test', 'US', 'SAL', 'GTM', 'IC4', 'Account Executive', '2015-07-01', '2025-12-31', 'terminated', 'male'),
      ('ACME-000009', 'Amelia', 'Wilson', 'amelia.wilson@acme.test', 'GB', 'ENG', 'SWE', 'IC4', 'Software Engineer', '2017-11-11', null, 'active', 'female'),
      ('ACME-000010', 'Oliver', 'Taylor', 'oliver.taylor@acme.test', 'GB', 'SAL', 'GTM', 'IC4', 'Account Executive', '2024-01-08', null, 'active', 'male'),
      ('ACME-000011', 'Sophia', 'Clarke', 'sophia.clarke@acme.test', 'GB', 'ENG', 'SWE', 'IC4', 'Software Engineer', '2025-02-03', null, 'active', 'female'),
      ('ACME-000012', 'George', 'Evans', 'george.evans@acme.test', 'GB', 'ENG', 'SWE', 'IC4', 'Software Engineer', '2014-04-01', null, 'active', 'male')
    ) as e(code, first_name, last_name, email, country, dept, family, level, title, hired, terminated, status, gender)
    join departments d on d.code = e.dept
    join job_families f on f.code = e.family
    join job_levels l on l.code = e.level;

    update employees set manager_id = (select id from employees where employee_code = 'ACME-000006')
    where employee_code in ('ACME-000005', 'ACME-000007');

    insert into salary_records (employee_id, amount_minor, currency_code, pay_frequency,
      effective_from, effective_to, reason)
    select e.id, s.amount_minor, s.currency, s.frequency::pay_frequency, s.from_date::date,
           s.to_date::date, s.reason::salary_reason
    from (values
      ('ACME-000001', 250000000, 'INR', 'annual', '2022-04-01', '2024-04-01', 'hire'),
      ('ACME-000001', 285000000, 'INR', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000002', 15000000, 'INR', 'monthly', '2024-04-01', null, 'merit'),
      ('ACME-000003', 220000000, 'INR', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000004', 260000000, 'INR', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000005', 13000000, 'USD', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000006', 15000000, 'USD', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000007', 9500000, 'USD', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000008', 16000000, 'USD', 'annual', '2024-04-01', '2025-12-31', 'merit'),
      ('ACME-000009', 10000000, 'GBP', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000010', 8500000, 'GBP', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000011', 7800000, 'GBP', 'annual', '2024-04-01', null, 'merit'),
      ('ACME-000012', 12500000, 'GBP', 'annual', '2024-04-01', null, 'merit')
    ) as s(code, amount_minor, currency, frequency, from_date, to_date, reason)
    join employees e on e.employee_code = s.code;
  `);
}
