import { Controller, Get, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';
import { Public, Roles } from './access.decorators.js';

@Controller('test-access')
class GuardedController {
  @Get('open')
  @Public()
  open(): string {
    return 'open';
  }

  @Get('viewer')
  @Roles('viewer')
  forViewers(): string {
    return 'viewer';
  }

  @Get('hr')
  @Roles('hr_manager')
  forHrManagers(): string {
    return 'hr';
  }

  @Get('undeclared')
  undeclared(): string {
    return 'should never be served';
  }
}

describe('access control (deny by default)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [GuardedController] });
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string, role?: string) => {
    const call = request(app.getHttpServer()).get(
      `/api/v1/test-access/${path}`,
    );
    return role === undefined ? call : call.set('x-dev-role', role);
  };

  it('serves a public route to anyone', async () => {
    expect((await get('open')).status).toBe(200);
  });

  it('answers 401 when nobody is signed in', async () => {
    const response = await get('viewer');

    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toMatch(/problem\+json/);
  });

  it('answers 401 for a role it does not know', async () => {
    expect((await get('viewer', 'superuser')).status).toBe(401);
  });

  it.each([
    ['viewer', 'viewer', 200],
    ['viewer', 'hr', 403],
    ['hr_manager', 'hr', 200],
    ['admin', 'hr', 200],
    ['admin', 'viewer', 200],
  ])('lets a %s reach /%s: %d', async (role, path, status) => {
    expect((await get(path, role)).status).toBe(status);
  });

  it('refuses a route that declares no roles, even to an admin', async () => {
    expect((await get('undeclared', 'admin')).status).toBe(403);
  });
});
