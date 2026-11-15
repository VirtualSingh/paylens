---
title: Data model — tables, constraints, indexes, money rules
updated: 2026-11-15
status: active
---

# Data model (PostgreSQL, Drizzle schema in `apps/api/src/db/schema/`)

Conventions: `snake_case` columns, `uuid` primary keys (`gen_random_uuid()`) except
reference tables, `timestamptz` for events, `date` for effective dating, every table has
`created_at` (and `updated_at` where rows mutate). Money = `bigint` minor units + ISO-4217
`char(3)`. Soft state via `status`, never hard deletes of business data.

## Enums

```
employment_type: full_time | part_time | contractor
employee_status: active | on_leave | terminated
pay_frequency:   annual | monthly
salary_reason:   hire | merit | promotion | market_adjustment | correction | transfer | other
user_role:       admin | hr_manager | viewer
gender:          female | male                                  -- D-2, decided 2026-11-15
import_status:   validating | validated | failed | committed
```

## Tables

```
currencies      code char(3) PK, name text, minor_units smallint
countries       code char(2) PK, name text, currency_code → currencies, region text
fx_rates        id, base_currency char(3) ('USD'), quote_currency → currencies,
                rate numeric(18,8) (1 base = rate quote), as_of date, source text
                UNIQUE (base_currency, quote_currency, as_of); CHECK rate > 0
departments     id, code text UNIQUE, name text
job_families    id, code text UNIQUE, name text
job_levels      id, code text UNIQUE ('IC1'..'IC6','M1'..'M4'), track text, rank smallint
employees       id uuid PK, employee_code text UNIQUE ('ACME-000001'),
                first_name, last_name, work_email citext UNIQUE,
                country_code → countries, department_id → departments,
                job_family_id → job_families, job_level_id → job_levels, job_title text,
                manager_id → employees NULL, employment_type, fte numeric(3,2) CHECK 0<fte<=1,
                hire_date date, termination_date date NULL CHECK (termination_date >= hire_date),
                status employee_status, gender gender NOT NULL,
                version integer NOT NULL DEFAULT 1, created_at, updated_at
salary_records  id uuid PK, employee_id → employees,
                amount_minor bigint CHECK > 0, currency_code → currencies,
                pay_frequency, effective_from date, effective_to date NULL,
                reason salary_reason, note text NULL, created_by → users NULL, created_at
                CHECK (effective_to IS NULL OR effective_to > effective_from)
                EXCLUDE USING gist (employee_id WITH =,
                        daterange(effective_from, effective_to, '[)') WITH &&)   -- no overlaps, ever
pay_bands       id, job_level_id → job_levels, country_code → countries, currency_code,
                min_minor, mid_minor, max_minor bigint CHECK (min<=mid AND mid<=max),
                effective_from date, effective_to date NULL,
                EXCLUDE USING gist (job_level_id WITH =, country_code WITH =,
                        daterange(effective_from, effective_to, '[)') WITH &&)
users           id uuid PK, email citext UNIQUE, display_name, google_sub text UNIQUE NULL,
                role user_role, is_demo boolean DEFAULT false, is_active boolean DEFAULT true,
                created_at, last_login_at
sessions        id uuid PK, user_id → users, token_hash bytea UNIQUE (sha-256 of opaque token),
                expires_at timestamptz, created_at, revoked_at NULL, ip inet NULL, user_agent text NULL
audit_events    id bigint identity PK, actor_user_id → users NULL, action text ('salary.changed'),
                entity_type text, entity_id uuid, before jsonb NULL, after jsonb NULL,
                request_id text, created_at
                -- append-only: app DB role has INSERT/SELECT only; no updated_at by design
import_jobs     id uuid PK, user_id → users, filename text, status import_status,
                total_rows int, valid_rows int, error_rows int, column_mapping jsonb,
                error_report jsonb (first 500 errors) , created_at, committed_at NULL
ai_queries      id uuid PK, user_id → users, question text, tools_called jsonb, answer text,
                model text, latency_ms int, input_tokens int, output_tokens int, created_at
settings        key text PK, value jsonb   -- e.g. reporting_currency = "USD"
```

Requires extensions: `btree_gist` (exclusion constraints), `citext`, `pg_trgm` (search).

## Views / read models

- `current_salaries` — one row per employee: the record where
  `effective_from <= current_date AND (effective_to IS NULL OR effective_to > current_date)`.
- `employee_comp` — employee ⨝ current salary ⨝ band (by level, country, as-of today) ⨝ fx
  (latest rate `as_of <= current_date`) → `annual_local_minor`, `annual_reporting_minor`,
  `compa_ratio`, `range_penetration`, `band_position`. Defined as a SQL view; if it gets
  slow at 100k rows, becomes a materialized view refreshed on write (documented, not built).

## Indexes (write them in the first migration; justify each in a comment)

```
employees(status), employees(country_code), employees(department_id), employees(job_level_id),
employees(manager_id), employees(lower(last_name), lower(first_name)),
GIN employees USING gin ((first_name || ' ' || last_name || ' ' || employee_code) gin_trgm_ops)
salary_records(employee_id, effective_from DESC)
salary_records(employee_id) WHERE effective_to IS NULL          -- current salary lookup
pay_bands(job_level_id, country_code, effective_from DESC)
fx_rates(quote_currency, as_of DESC)
audit_events(entity_type, entity_id, created_at DESC), audit_events(actor_user_id, created_at DESC)
sessions(expires_at)   -- for cleanup
```

Phase 4 records `EXPLAIN (ANALYZE, BUFFERS)` for the directory query, the current-salary join
and the breakdown query in `docs/perf.md`.

## Money, currency and rounding rules (also implemented and tested in `libs/domain`)

- Store `amount_minor` as `bigint`; `Money = { amountMinor: bigint, currency }`. Format with
  `Intl.NumberFormat` and the currency's `minor_units`. Never `number` for money math.
- Annualisation: `annual = monthly × 12`; `annual = annual × 1`. Hourly is out of scope (ADR-004).
- Conversion: `reporting = round_half_even(local_minor × rate(local→reporting, as_of))`, where
  `rate(a→b)` is derived from USD-based rates: `rate(a→b) = rate(USD→b) / rate(USD→a)`.
  Computed as one exact fraction of bigints (no decimal library), rounded half-even once (ADR-004).
- Rate selection: the latest `fx_rates.as_of <= requested date`; if none, the metric is
  reported as "unavailable", never silently 0 or 1.
- Totals are summed in minor units of the reporting currency after per-row conversion
  (not converted after summing) so row-level and total figures reconcile.
- FTE: analytics report *actual* pay (as recorded); an optional "FTE-normalised" toggle
  divides by `fte`. Default off; labelled when on.

## Effective dating rules

- A salary record is valid on `[effective_from, effective_to)`. The current record has
  `effective_to IS NULL`. Future-dated records are allowed (planned raises); "current" is
  evaluated against `current_date`.
- Changing salary closes the current record at the new `effective_from`. Inserting a record
  with `effective_from` earlier than the current one is a **correction** of history and
  requires `reason = correction`; the service re-slices the affected records inside one
  transaction and the exclusion constraint guards the result.
- Nothing is ever UPDATEd except `effective_to` when a record is closed; everything else is
  INSERT. Audit events capture before/after of the affected rows.

## Seed shape

See [seed.md](seed.md): 8 countries, 10 departments, 6 job families, 10 levels, bands per
level × country, 10,000 employees with 0–5 historical salary records each, FX as-of two dates.
