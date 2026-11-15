import { ProblemDetailsSchema } from './problem-details.schema.js';

describe('ProblemDetailsSchema', () => {
  const base = {
    type: 'about:blank',
    instance: '/api/v1/employees',
    requestId: 'req-1',
  };

  it('reads a validation problem with its field errors', () => {
    const problem = ProblemDetailsSchema.parse({
      ...base,
      title: 'Bad Request',
      status: 400,
      detail: 'Some fields are invalid',
      errors: [
        { path: 'levelCode', message: 'There is no level with this code' },
      ],
    });

    expect(problem.errors?.[0]?.path).toBe('levelCode');
  });

  it('reads a broken business rule with its code', () => {
    const problem = ProblemDetailsSchema.parse({
      ...base,
      title: 'Unprocessable Entity',
      status: 422,
      code: 'reporting_cycle',
    });

    expect(problem.code).toBe('reporting_cycle');
  });

  it('rejects a body that is not a problem', () => {
    expect(ProblemDetailsSchema.safeParse({ message: 'oops' }).success).toBe(
      false,
    );
  });
});
