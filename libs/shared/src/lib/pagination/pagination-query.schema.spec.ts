import { PaginationQuerySchema } from './pagination-query.schema.js';

describe('PaginationQuerySchema', () => {
  it('reads page and pageSize from query-string values', () => {
    const query = { page: '3', pageSize: '25' };

    const result = PaginationQuerySchema.parse(query);

    expect(result).toEqual({ page: 3, pageSize: 25 });
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects page %s', (page) => {
    const result = PaginationQuerySchema.safeParse({ page, pageSize: '50' });

    expect(result.success).toBe(false);
  });

  it.each(['0', '101', '2.5'])('rejects pageSize %s', (pageSize) => {
    const result = PaginationQuerySchema.safeParse({ page: '1', pageSize });

    expect(result.success).toBe(false);
  });

  it('accepts the largest page size, 100', () => {
    const result = PaginationQuerySchema.parse({ page: '1', pageSize: '100' });

    expect(result.pageSize).toBe(100);
  });
});
