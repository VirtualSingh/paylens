import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';

describe('OpenAPI docs at /api/docs', () => {
  describe('when docs are enabled', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp({ docs: true });
    });

    afterAll(async () => {
      await app.close();
    });

    it('publishes an OpenAPI document that lists the API routes', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      expect(response.status).toBe(200);
      expect(response.body.info.title).toBe('PayLens API');
      expect(Object.keys(response.body.paths)).toContain('/api/v1/health');
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
