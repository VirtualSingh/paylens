# ADR-004 — Store money as integer minor units with ISO codes; compare via dated FX rates in a reporting currency

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
Salaries are paid in eight currencies and must be compared and totalled. Floating-point
money produces rounding drift; converting after summing produces totals that do not match
the rows; live FX feeds add an external dependency the demo does not need.

## Options considered
1. `numeric(18,2)` in the DB + JS `number` in code — simple; `number` loses precision above 2^53 in minor units and invites float math.
2. **`bigint` minor units + currency code**, decimal library for rates — exact; needs care at the JSON boundary (strings).
3. Store everything pre-converted in USD — simplest analytics; destroys local truth and makes rate changes rewrite history.

## Decision
Option 2. `Money = { amountMinor: bigint, currency }`; JSON carries `amountMinor` as a string.
`fx_rates` holds USD-based rates with an `as_of` date; conversions pick the latest rate on or
before the as-of date, derive cross rates via USD, use ~~`big.js`~~ exact rational `bigint` arithmetic (see note), and round half-even back to
minor units. Totals are sums of converted rows. Pay frequency (`annual`, `monthly`) is explicit
and annualised with fixed factors. Hourly pay, FTE proration by default, and live FX feeds
are out of scope.

## Consequences
- Positive: exact arithmetic; reproducible historical comparisons; UI can always say "≈, rate as of".
- Negative: bigint ergonomics in TS and JSON; developers must use `MoneyText`/domain helpers.
  Mitigation: lint rule against `Number(amountMinor)`, helpers with 100% test coverage.
- Follow-ups: if a tenant needs hourly pay, add `hourly` with hours-per-year configuration.

## Note (2026-11-15, implementation)
Rates are parsed into integer coefficients and the whole conversion is one fraction of
bigints, rounded half-even once (`libs/domain/src/lib/fx/fx-table.ts`). Exact, no
precision limit, and `libs/domain` keeps zero dependencies (enforced by lint); `big.js`
was not needed.

## Links
docs/vault/design/data-model.md (money rules) · docs/vault/design/analytics.md · F-15, F-16
