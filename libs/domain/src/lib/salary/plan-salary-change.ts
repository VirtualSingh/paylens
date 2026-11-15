import type { CurrencyCode } from '../money/money.js';
import {
  EffectiveDateNotAfterCurrentError,
  SalaryCurrencyError,
  SalaryNotPositiveError,
} from './salary-errors.js';
import type {
  SalaryChange,
  SalaryChangePlan,
  SalaryRecord,
} from './salary-record.js';

export interface SalaryRules {
  /** One currency per country (requirements → assumptions). */
  readonly countryCurrency: CurrencyCode;
}

/**
 * Turns a requested salary change into the rows to close and the row to insert (ADR-005).
 * Pure: the caller loads the history and executes the plan in one transaction, where the
 * database's exclusion constraint guards the result as well.
 */
export function planSalaryChange(
  history: readonly SalaryRecord[],
  change: SalaryChange,
  rules: SalaryRules,
): SalaryChangePlan {
  if (change.amount.amountMinor <= 0n) {
    throw new SalaryNotPositiveError();
  }
  if (change.amount.currency !== rules.countryCurrency) {
    throw new SalaryCurrencyError(
      change.amount.currency,
      rules.countryCurrency,
    );
  }

  const open = history.find((record) => record.effectiveTo === null);
  if (open && change.effectiveFrom <= open.effectiveFrom) {
    throw new EffectiveDateNotAfterCurrentError(open.effectiveFrom);
  }

  return {
    close: open
      ? [{ recordId: open.id, effectiveTo: change.effectiveFrom }]
      : [],
    insert: {
      effectiveFrom: change.effectiveFrom,
      effectiveTo: null,
      amount: change.amount,
      frequency: change.frequency,
      reason: change.reason,
      note: change.note ?? null,
    },
  };
}
