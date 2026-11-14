import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../testing/create-test-app.js';

describe('security headers (security.md, A02)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('restricts content to our own origin, with no inline code and no framing', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    const csp = response.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  it('tells browsers not to sniff content types and to stay on HTTPS', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toContain('max-age=');
  });

  it('does not advertise the server framework', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
