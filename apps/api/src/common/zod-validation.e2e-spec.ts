import { Controller, Get, type INestApplication, Query } from '@nestjs/common';
import { type PaginationQuery, PaginationQuerySchema } from '@paylens/shared';
import request from 'supertest';
import { Public } from '../auth/access.decorators.js';
import { createTestApp } from '../testing/create-test-app.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

@Controller('test-validation')
@Public()
class EchoController {
  @Get()
  echo(
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ): PaginationQuery {
    return query;
  }
}

describe('request validation with the shared Zod schemas', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [EchoController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('hands the handler the parsed, typed value', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/test-validation?page=2',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ page: 2, pageSize: 50 });
  });

  it('answers 400 problem+json listing every invalid field', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/test-validation?page=0&pageSize=500',
    );

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toMatchObject({
      title: 'Bad Request',
      detail: 'Some fields are invalid',
      errors: [
        { path: 'page', message: expect.any(String) },
        { path: 'pageSize', message: expect.any(String) },
      ],
    });
  });
});
