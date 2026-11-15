import { type EmploymentFacts, planStatusChange } from './status-change.js';

describe('planStatusChange', () => {
  // Hired 2022-09-01; current salary since 2024-04-01.
  const active: EmploymentFacts = {
    status: 'active',
    hireDate: '2022-09-01',
    openSalary: { id: 'rec-2', effectiveFrom: '2024-04-01' },
  };

  it('sends a person on leave without touching their salary', () => {
    expect(
      planStatusChange(active, {
        status: 'on_leave',
        effectiveDate: '2026-12-01',
      }),
    ).toEqual({
      status: 'on_leave',
      terminationDate: null,
      closeSalary: null,
    });
  });

  it('brings a person back from leave', () => {
    expect(
      planStatusChange(
        { ...active, status: 'on_leave' },
        { status: 'active', effectiveDate: '2027-01-04' },
      ).status,
    ).toBe('active');
  });

  it('ends employment on the termination date and closes the salary there', () => {
    expect(
      planStatusChange(active, {
        status: 'terminated',
        effectiveDate: '2026-12-31',
      }),
    ).toEqual({
      status: 'terminated',
      terminationDate: '2026-12-31',
      closeSalary: { recordId: 'rec-2', effectiveTo: '2026-12-31' },
    });
  });

  it('terminates someone with no open salary without closing anything', () => {
    expect(
      planStatusChange(
        { ...active, status: 'on_leave', openSalary: null },
        { status: 'terminated', effectiveDate: '2026-12-31' },
      ).closeSalary,
    ).toBeNull();
  });

  it.each([
    [
      'a person who has left (rehiring is a new record)',
      { ...active, status: 'terminated' as const },
      { status: 'active' as const, effectiveDate: '2026-12-01' },
      'employee_terminated',
    ],
    [
      'the status the person already has',
      active,
      { status: 'active' as const, effectiveDate: '2026-12-01' },
      'status_unchanged',
    ],
    [
      'a date before the hire date',
      active,
      { status: 'on_leave' as const, effectiveDate: '2022-08-31' },
      'status_date_before_hire',
    ],
    [
      'a termination on or before the current salary started',
      active,
      { status: 'terminated' as const, effectiveDate: '2024-04-01' },
      'termination_before_current_salary',
    ],
  ])('refuses %s', (_case, facts, change, code) => {
    expect(() => planStatusChange(facts, change)).toThrow(
      expect.objectContaining({ code }),
    );
  });
});
