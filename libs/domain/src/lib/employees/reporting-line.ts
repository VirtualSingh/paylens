import { DomainError } from '../errors.js';

export class ReportingCycleError extends DomainError {
  readonly code = 'reporting_cycle';

  constructor() {
    super(
      'A person cannot report to themselves or to someone who reports to them',
    );
  }
}

/**
 * A new manager is fine unless the person would end up above themselves in the org chart.
 * `managerLine` is the new manager's id, then their manager's, and so on up to the top; if
 * the person is anywhere in it, the change would make a loop.
 */
export function assertNoReportingCycle(
  personId: string,
  managerLine: readonly string[],
): void {
  if (managerLine.includes(personId)) {
    throw new ReportingCycleError();
  }
}
