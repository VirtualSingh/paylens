import {
  Controller,
  Get,
  type INestApplication,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EffectiveDateNotAfterCurrentError } from '@paylens/domain';
import request from 'supertest';
import { Public } from '../auth/access.decorators.js';
import { createTestApp } from '../testing/create-test-app.js';

const SECRET = 'postgres://paylens:hunter2@db.internal/paylens';

@Controller('test-failures')
@Public()
class FailingController {
  @Get('bug')
  bug(): never {
    throw new Error(`could not connect to ${SECRET}`);
  }

  @Get('unavailable')
  unavailable(): never {
    throw new ServiceUnavailableException(`pool exhausted for ${SECRET}`);
  }

  @Get('rule')
  rule(): never {
    throw new EffectiveDateNotAfterCurrentError('2025-04-01');
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

  it('reports a broken business rule as a 422 problem with its code', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/test-failures/rule',
    );

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      title: 'Unprocessable Entity',
      status: 422,
      code: 'effective_date_not_after_current',
      detail:
        'Effective date must be after 2025-04-01, when the current salary started',
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
