import type { INestApplication } from '@nestjs/common';
import { CHANGE_REASONS } from '@paylens/shared';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';

interface Operation {
  readonly parameters?: readonly {
    name: string;
    in: string;
    required?: boolean;
  }[];
  readonly requestBody?: { content: Record<string, { schema: unknown }> };
  readonly responses: Record<string, { content?: Record<string, unknown> }>;
}

describe('OpenAPI docs at /api/docs', () => {
  describe('when docs are enabled', () => {
    let app: INestApplication;
    let document: {
      openapi: string;
      info: { title: string };
      paths: Record<string, Record<string, Operation>>;
    };

    beforeAll(async () => {
      app = await createTestApp({ docs: true });
      document = (await request(app.getHttpServer()).get('/api/docs-json'))
        .body;
    });

    afterAll(async () => {
      await app.close();
    });

    it('publishes an OpenAPI 3.1 document that lists the API routes', () => {
      expect(document.openapi).toBe('3.1.0');
      expect(document.info.title).toBe('PayLens API');
      expect(Object.keys(document.paths)).toContain('/api/v1/health');
    });

    it('describes a route with the shared schemas: body, success, problems and If-Match', () => {
      const change =
        document.paths['/api/v1/employees/{id}/salary-changes']?.['post'];

      expect(
        change?.requestBody?.content['application/json']?.schema,
      ).toMatchObject({
        properties: { reason: { enum: [...CHANGE_REASONS] } },
      });
      expect(change?.responses['201']?.content?.['application/json']).toEqual(
        expect.objectContaining({
          schema: expect.objectContaining({
            required: ['record', 'pay', 'version'],
          }),
        }),
      );
      expect(Object.keys(change?.responses ?? {})).toEqual(
        expect.arrayContaining([
          '400',
          '401',
          '403',
          '404',
          '409',
          '422',
          '428',
        ]),
      );
      expect(change?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'If-Match',
          in: 'header',
          required: true,
        }),
      );
    });

    it('lists the directory filters as query parameters', () => {
      const names = (
        document.paths['/api/v1/employees']?.['get']?.parameters ?? []
      ).map((parameter) => parameter.name);

      expect(names).toEqual(
        expect.arrayContaining([
          'q',
          'country',
          'level',
          'sort',
          'page',
          'pageSize',
        ]),
      );
    });

    it('documents a success body and problem+json errors for every operation', () => {
      // The one error that is not a problem: readiness answers 503 with its checks report.
      const reportsChecks = (path: string, status: string) =>
        path === '/api/v1/health/ready' && status === '503';

      const undocumented = Object.entries(document.paths).flatMap(
        ([path, operations]) =>
          Object.entries(operations)
            .filter(([, operation]) => {
              const statuses = Object.entries(operation.responses);
              const success = statuses.some(
                ([status, response]) =>
                  status === '204' ||
                  (status.startsWith('2') &&
                    response.content?.['application/json'] !== undefined),
              );
              const problems = statuses.every(
                ([status, response]) =>
                  status.startsWith('2') ||
                  reportsChecks(path, status) ||
                  response.content?.['application/problem+json'] !== undefined,
              );
              return !(success && problems);
            })
            .map(([method]) => `${method.toUpperCase()} ${path}`),
      );

      expect(undocumented).toEqual([]);
    });

    it('matches docs/api/openapi.json (update it with: pnpm openapi)', async () => {
      await expect(
        `${JSON.stringify(document, null, 2)}\n`,
      ).toMatchFileSnapshot('../../../../docs/api/openapi.json');
    });
  });

  describe('when docs are disabled', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp({ docs: false });
    });

    afterAll(async () => {
      await app.close();
    });

    it('does not serve them', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      expect(response.status).toBe(404);
    });
  });
});
