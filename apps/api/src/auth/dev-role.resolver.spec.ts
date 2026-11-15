import type { Request } from 'express';
import { DevRoleHeaderResolver } from './dev-role.resolver.js';

const requestWith = (headers: Record<string, string>) =>
  ({ header: (name: string) => headers[name.toLowerCase()] }) as Pick<
    Request,
    'header'
  >;

describe('DevRoleHeaderResolver', () => {
  it('reads the role from x-dev-role outside production', async () => {
    const resolver = new DevRoleHeaderResolver('development');

    const user = await resolver.resolve(
      requestWith({ 'x-dev-role': 'hr_manager' }),
    );

    expect(user).toEqual({ id: null, role: 'hr_manager', isDemo: false });
  });

  it('ignores the header in production, so it can never be used to sign in there', async () => {
    const resolver = new DevRoleHeaderResolver('production');

    const user = await resolver.resolve(requestWith({ 'x-dev-role': 'admin' }));

    expect(user).toBeNull();
  });
});
