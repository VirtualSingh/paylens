import { EmployeeDirectoryQuerySchema } from './employee-directory-query.schema.js';

describe('EmployeeDirectoryQuerySchema', () => {
  it('defaults to the first page of 50, sorted by last name, in USD', () => {
    const query = EmployeeDirectoryQuerySchema.parse({});

    expect(query).toEqual({
      page: 1,
      pageSize: 50,
      country: [],
      department: [],
      level: [],
      status: [],
      bandPosition: [],
      sort: [{ field: 'lastName', direction: 'asc' }],
      reportingCurrency: 'USD',
    });
  });

  it('accepts a filter given once or repeated in the query string', () => {
    const once = EmployeeDirectoryQuerySchema.parse({ country: 'IN' });
    const repeated = EmployeeDirectoryQuerySchema.parse({
      country: ['IN', 'DE'],
    });

    expect(once.country).toEqual(['IN']);
    expect(repeated.country).toEqual(['IN', 'DE']);
  });

  it('parses a multi-field sort with directions', () => {
    const query = EmployeeDirectoryQuerySchema.parse({
      sort: 'annualReporting:desc,lastName',
    });

    expect(query.sort).toEqual([
      { field: 'annualReporting', direction: 'desc' },
      { field: 'lastName', direction: 'asc' },
    ]);
  });

  it('rejects a sort field outside the allowlist, naming where', () => {
    const result = EmployeeDirectoryQuerySchema.safeParse({
      sort: 'salary:desc',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['sort', 0, 'field']);
  });

  it.each([
    ['a one-letter search', { q: 'a' }],
    ['a lower-case country', { country: 'in' }],
    ['an unknown status', { status: 'retired' }],
    ['an unknown band position', { bandPosition: 'middle' }],
    ['a manager id that is not a UUID', { managerId: '42' }],
    ['a reporting currency that is not ISO 4217', { reportingCurrency: 'usd' }],
  ])('rejects %s', (_case, input) => {
    expect(EmployeeDirectoryQuerySchema.safeParse(input).success).toBe(false);
  });

  it('keeps a trimmed search term of two or more characters', () => {
    expect(EmployeeDirectoryQuerySchema.parse({ q: '  me ' }).q).toBe('me');
  });
});
