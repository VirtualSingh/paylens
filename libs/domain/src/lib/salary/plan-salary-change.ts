import type { CurrencyCode } from '../money/money.js';
import type { IsoDate } from '../time/iso-date.js';
import {
  CorrectionOutsideHistoryError,
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

  if (change.reason === 'correction') {
    return planCorrection(history, change);
  }

  const open = history.find((record) => record.effectiveTo === null);
  if (open && change.effectiveFrom <= open.effectiveFrom) {
    throw new EffectiveDateNotAfterCurrentError(open.effectiveFrom);
  }

  return {
    close: open
      ? [{ recordId: open.id, effectiveTo: change.effectiveFrom }]
      : [],
    insert: newRecord(change, null),
  };
}

/**
 * A correction replaces the salary from its date until the end of the record that date falls
 * in: that record is closed at the correction date and the corrected amount runs to the old
 * end. Starting on the record's first day closes it at its own start — a zero-length record
 * that stays in history but covers no days (ADR-005: the past is never rewritten).
 */
function planCorrection(
  history: readonly SalaryRecord[],
  change: SalaryChange,
): SalaryChangePlan {
  const corrected = history.find((record) =>
    covers(record, change.effectiveFrom),
  );
  if (!corrected) {
    throw new CorrectionOutsideHistoryError(change.effectiveFrom);
  }
  return {
    close: [{ recordId: corrected.id, effectiveTo: change.effectiveFrom }],
    insert: newRecord(change, corrected.effectiveTo),
  };
}

/** Whether `date` falls in [effectiveFrom, effectiveTo); zero-length records cover nothing. */
function covers(record: SalaryRecord, date: IsoDate): boolean {
  return (
    record.effectiveFrom <= date &&
    (record.effectiveTo === null || date < record.effectiveTo)
  );
}

function newRecord(
  change: SalaryChange,
  effectiveTo: IsoDate | null,
): SalaryChangePlan['insert'] {
  return {
    effectiveFrom: change.effectiveFrom,
    effectiveTo,
    amount: change.amount,
    frequency: change.frequency,
    reason: change.reason,
    note: change.note ?? null,
  };
}
