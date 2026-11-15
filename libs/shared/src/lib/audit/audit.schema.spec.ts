import { AuditQuerySchema } from './audit.schema.js';

describe('AuditQuerySchema', () => {
  it('defaults to the first page and no filters', () => {
    expect(AuditQuerySchema.parse({})).toEqual({ page: 1, pageSize: 50 });
  });

  it('accepts every filter the audit log offers', () => {
    const query = {
      entityType: 'employee',
      entityId: '7f1d2c3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f',
      actor: '0e1d2c3b-4a59-4687-9a6b-5c4d3e2f1a0b',
      action: 'salary.changed',
      from: '2026-11-01',
      to: '2026-11-30',
    };

    expect(AuditQuerySchema.parse(query)).toMatchObject(query);
  });

  it.each([
    ['an action that is not "thing.happened"', { action: 'DROP TABLE' }],
    ['an entity id that is not a UUID', { entityId: '42' }],
    [
      'a range that ends before it starts',
      { from: '2026-12-01', to: '2026-11-01' },
    ],
  ])('rejects %s', (_case, query) => {
    expect(AuditQuerySchema.safeParse(query).success).toBe(false);
  });
});
