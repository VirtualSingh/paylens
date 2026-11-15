import { DomainError } from '../errors.js';
import type { CurrencyCode } from '../money/money.js';
import type { IsoDate } from '../time/iso-date.js';

export class SalaryNotPositiveError extends DomainError {
  readonly code = 'salary_not_positive';

  constructor() {
    super('A salary must be greater than zero');
  }
}

export class SalaryCurrencyError extends DomainError {
  readonly code = 'salary_currency_not_country_currency';

  constructor(given: CurrencyCode, expected: CurrencyCode) {
    super(`Salaries in this country are paid in ${expected}, not ${given}`);
  }
}

/** A new salary must start after the current one; earlier dates are corrections. */
export class EffectiveDateNotAfterCurrentError extends DomainError {
  readonly code = 'effective_date_not_after_current';

  constructor(readonly currentFrom: IsoDate) {
    super(
      `Effective date must be after ${currentFrom}, when the current salary started`,
    );
  }
}
