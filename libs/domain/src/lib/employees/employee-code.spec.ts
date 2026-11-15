import { nextEmployeeCode } from './employee-code.js';

describe('nextEmployeeCode', () => {
  it('starts at ACME-000001 in an empty organisation', () => {
    expect(nextEmployeeCode(null)).toBe('ACME-000001');
  });

  it('follows the highest code, keeping six digits', () => {
    expect(nextEmployeeCode('ACME-010000')).toBe('ACME-010001');
  });

  it('refuses a highest code it cannot read, rather than guess', () => {
    expect(() => nextEmployeeCode('EMP-42')).toThrow(
      'Unexpected employee code "EMP-42"',
    );
  });

  it('refuses to go past ACME-999999, where six digits run out', () => {
    expect(() => nextEmployeeCode('ACME-999999')).toThrow(
      'Employee codes are exhausted',
    );
  });
});
