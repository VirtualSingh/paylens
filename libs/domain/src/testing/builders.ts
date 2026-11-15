import { Money } from '../lib/money/money.js';
import type { SalaryRecord } from '../lib/salary/salary-record.js';

/**
 * Test-data builders (testing.md): valid defaults, override only what the test is about.
 */
export function aSalaryRecord(
  overrides: Partial<SalaryRecord> = {},
): SalaryRecord {
  return {
    id: 'salary-1',
    amount: Money.of(285_000_000n, 'INR'),
    frequency: 'annual',
    effectiveFrom: '2025-04-01',
    effectiveTo: null,
    reason: 'merit',
    ...overrides,
  };
}
