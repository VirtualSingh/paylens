import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';

describe('errors as application/problem+json (RFC 9457)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('describes an unknown route as a 404 problem carrying the request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/no-such-route')
      .set('x-request-id', 'req-404');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Cannot GET /api/v1/no-such-route',
      instance: '/api/v1/no-such-route',
      requestId: 'req-404',
    });
  });
});
