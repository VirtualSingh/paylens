import { ApiError } from './api-client';
import { formProblem } from './form-problems';

const problem = (status: number, extra: object = {}) =>
  new ApiError({
    type: 'about:blank',
    title: 'Error',
    status,
    instance: '/api/v1/employees',
    detail: 'Explained',
    ...extra,
  });

describe('formProblem', () => {
  const options = {
    fields: ['workEmail', 'effectiveDate'],
    ruleFields: { status_date_before_hire: 'effectiveDate' },
  };

  it('puts 400 field errors on the fields the form has', () => {
    expect(
      formProblem(
        problem(400, {
          errors: [
            { path: 'workEmail', message: 'Invalid email' },
            { path: 'salary.amount', message: 'Not this form' },
          ],
        }),
        options,
      ),
    ).toEqual({
      fields: [{ field: 'workEmail', message: 'Invalid email' }],
      message: null,
      conflict: false,
    });
  });

  it('puts a broken rule on the field it is about', () => {
    expect(
      formProblem(problem(422, { code: 'status_date_before_hire' }), options)
        .fields,
    ).toEqual([{ field: 'effectiveDate', message: 'Explained' }]);
  });

  it('treats 409 as a stale version, unless the form says which field it is about', () => {
    expect(formProblem(problem(409), options).conflict).toBe(true);
    expect(
      formProblem(problem(409), { ...options, conflictField: 'workEmail' })
        .fields,
    ).toEqual([{ field: 'workEmail', message: 'Explained' }]);
  });

  it('says anything else once, with the request id to quote', () => {
    expect(
      formProblem(problem(500, { requestId: 'req-9' }), options).message,
    ).toBe('Explained (request req-9)');
  });

  it('has a plain message when the failure is not from the API', () => {
    expect(formProblem(new Error('offline'), options).message).toBe(
      'This could not be saved. Try again.',
    );
  });
});
