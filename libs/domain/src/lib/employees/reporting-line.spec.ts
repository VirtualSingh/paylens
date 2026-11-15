import { DomainError } from '../errors.js';
import { assertNoReportingCycle } from './reporting-line.js';

describe('assertNoReportingCycle', () => {
  // Liam manages Emma; Emma manages Ava. Lines run from the manager up to the top.
  it('accepts a manager from outside the person’s own line', () => {
    expect(() =>
      assertNoReportingCycle('emma', ['noah', 'olivia']),
    ).not.toThrow();
  });

  it('refuses the person as their own manager', () => {
    expect(() => assertNoReportingCycle('emma', ['emma', 'liam'])).toThrow(
      DomainError,
    );
  });

  it('refuses someone who reports to the person, directly or further down', () => {
    let error: unknown;
    try {
      assertNoReportingCycle('liam', ['ava', 'emma', 'liam']);
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      code: 'reporting_cycle',
      message:
        'A person cannot report to themselves or to someone who reports to them',
    });
  });
});
