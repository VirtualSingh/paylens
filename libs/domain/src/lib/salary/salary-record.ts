import type { Money } from '../money/money.js';
import type { IsoDate } from '../time/iso-date.js';
import type { PayFrequency } from './pay-frequency.js';

/** Why a salary changed (glossary). `correction` fixes history instead of adding to it. */
export type SalaryReason =
  | 'hire'
  | 'merit'
  | 'promotion'
  | 'market_adjustment'
  | 'correction'
  | 'transfer'
  | 'other';

/**
 * One effective-dated salary: valid on [effectiveFrom, effectiveTo) — the end date is
 * exclusive and `null` means "until further notice" (ADR-005).
 */
export interface SalaryRecord {
  readonly id: string;
  readonly amount: Money;
  readonly frequency: PayFrequency;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
  readonly reason: SalaryReason;
}

/** What the HR manager asks for in "Change salary". */
export interface SalaryChange {
  readonly effectiveFrom: IsoDate;
  readonly amount: Money;
  readonly frequency: PayFrequency;
  readonly reason: SalaryReason;
  readonly note?: string;
}

/**
 * What to write, in one transaction: set `effectiveTo` on existing records (the only
 * update history ever gets) and insert one new record.
 */
export interface SalaryChangePlan {
  readonly close: readonly {
    readonly recordId: string;
    readonly effectiveTo: IsoDate;
  }[];
  readonly insert: Omit<SalaryRecord, 'id'> & { readonly note: string | null };
}
