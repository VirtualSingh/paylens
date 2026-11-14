import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('x-request-id', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a request id when the caller sends none', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it("echoes the caller's request id so logs can be joined across services", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', 'web-7f3a.1');

    expect(response.headers['x-request-id']).toBe('web-7f3a.1');
  });

  it.each([
    ['too long', 'a'.repeat(129)],
    ['with spaces', 'two words'],
    ['with markup', '<script>'],
  ])('replaces a caller id that is %s', async (_case, unsafeId) => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', unsafeId);

    expect(response.headers['x-request-id']).toMatch(UUID);
  });
});
