import {
  CreateEmployeeRequestSchema,
  UpdateEmployeeRequestSchema,
} from './employee-write.schema.js';

describe('UpdateEmployeeRequestSchema', () => {
  it('accepts an edit of a single field', () => {
    expect(
      UpdateEmployeeRequestSchema.parse({ jobTitle: ' Staff Engineer ' }),
    ).toEqual({ jobTitle: 'Staff Engineer' });
  });

  it('accepts null as "reports to nobody"', () => {
    expect(UpdateEmployeeRequestSchema.parse({ managerId: null })).toEqual({
      managerId: null,
    });
  });

  it('rejects an edit with nothing in it', () => {
    expect(UpdateEmployeeRequestSchema.safeParse({}).success).toBe(false);
  });

  it.each([
    ['country', { countryCode: 'GB' }],
    ['hire date', { hireDate: '2020-01-01' }],
    ['status, which has its own endpoint', { status: 'terminated' }],
  ])('refuses to change the %s here', (_case, field) => {
    expect(
      UpdateEmployeeRequestSchema.safeParse({ jobTitle: 'Staff', ...field })
        .success,
    ).toBe(false);
  });
});

describe('CreateEmployeeRequestSchema', () => {
  const valid = {
    firstName: '  Kavya ',
    lastName: 'Iyer',
    workEmail: 'kavya.iyer@acme.test',
    countryCode: 'IN',
    departmentCode: 'ENG',
    jobFamilyCode: 'SWE',
    levelCode: 'IC3',
    jobTitle: 'Software Engineer',
    employmentType: 'full_time',
    hireDate: '2026-11-02',
    gender: 'female',
    salary: {
      amount: { amountMinor: '200000000', currency: 'INR' },
      frequency: 'annual',
    },
  };

  it('accepts a new person, trims names, and defaults to full time with no manager', () => {
    const parsed = CreateEmployeeRequestSchema.parse(valid);

    expect(parsed).toMatchObject({
      firstName: 'Kavya',
      fte: '1',
      managerId: null,
    });
  });

  it.each(['0.5', '0.75', '1', '1.00'])('accepts an FTE of %s', (fte) => {
    expect(
      CreateEmployeeRequestSchema.safeParse({ ...valid, fte }).success,
    ).toBe(true);
  });

  it.each([
    ['an FTE of zero', { fte: '0.00' }],
    ['an FTE above one', { fte: '1.5' }],
    ['an FTE as a float', { fte: 0.5 }],
    ['an empty first name', { firstName: '   ' }],
    ['an email without a domain', { workEmail: 'kavya.iyer' }],
    ['a level outside the ladder', { levelCode: 'IC7' }],
    ['a gender outside the recorded values', { gender: 'unknown' }],
    ['a contract type that does not exist', { employmentType: 'intern' }],
  ])('rejects %s', (_case, change) => {
    expect(
      CreateEmployeeRequestSchema.safeParse({ ...valid, ...change }).success,
    ).toBe(false);
  });
});
