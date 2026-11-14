import {
  Controller,
  Get,
  type INestApplication,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';

const SECRET = 'postgres://paylens:hunter2@db.internal/paylens';

@Controller('test-failures')
class FailingController {
  @Get('bug')
  bug(): never {
    throw new Error(`could not connect to ${SECRET}`);
  }

  @Get('unavailable')
  unavailable(): never {
    throw new ServiceUnavailableException(`pool exhausted for ${SECRET}`);
  }
}

describe('errors as application/problem+json (RFC 9457)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [FailingController] });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('hides an unexpected error behind a generic 500 problem', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .get('/api/v1/test-failures/bug')
      .set('x-request-id', 'req-500');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/api/v1/test-failures/bug',
      requestId: 'req-500',
    });
  });

  it('never exposes the message of a server-side HTTP error', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer()).get(
      '/api/v1/test-failures/unavailable',
    );

    expect(response.status).toBe(503);
    expect(response.text).not.toContain('hunter2');
    expect(response.body).not.toHaveProperty('detail');
  });

  it('logs an unexpected error with its request id but without its message', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await request(app.getHttpServer())
      .get('/api/v1/test-failures/bug')
      .set('x-request-id', 'req-log');

    expect(logError).toHaveBeenCalledOnce();
    const logged = logError.mock.calls.flat().join('\n');
    expect(logged).toContain('req-log');
    expect(logged).not.toContain('hunter2');
  });
});
