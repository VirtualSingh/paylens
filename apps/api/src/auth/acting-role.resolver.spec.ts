import type { Request } from 'express';
import { ActingRoleResolver } from './acting-role.resolver.js';
import { DEMO_USERS } from './demo-users.js';

const requestWith = (
  headers: Record<string, string>,
): Pick<Request, 'header'> =>
  ({
    header: (name: string) => headers[name.toLowerCase()],
  }) as Pick<Request, 'header'>;

describe('ActingRoleResolver (sign-in off)', () => {
  const resolver = new ActingRoleResolver();

  it('acts as the demo user of the role in x-acting-role', async () => {
    expect(
      await resolver.resolve(requestWith({ 'x-acting-role': 'viewer' })),
    ).toEqual({ id: DEMO_USERS.viewer.id, role: 'viewer', isDemo: true });
  });

  it('acts as the demo HR manager without a role, or with one it does not know', async () => {
    const cases: Record<string, string>[] = [{}, { 'x-acting-role': 'owner' }];
    for (const headers of cases) {
      expect(await resolver.resolve(requestWith(headers))).toEqual({
        id: DEMO_USERS.hr_manager.id,
        role: 'hr_manager',
        isDemo: true,
      });
    }
  });
});
