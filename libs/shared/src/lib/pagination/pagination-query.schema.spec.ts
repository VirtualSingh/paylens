import { PaginationQuerySchema } from './pagination-query.schema.js';

describe('PaginationQuerySchema', () => {
  it('reads page and pageSize from query-string values', () => {
    const query = { page: '3', pageSize: '25' };

    const result = PaginationQuerySchema.parse(query);

    expect(result).toEqual({ page: 3, pageSize: 25 });
  });
});
