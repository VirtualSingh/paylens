import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { server } from '../testing/msw';
import { ApiError, apiRequest } from './api-client';

const Thing = z.object({ id: z.string(), name: z.string() });

describe('apiRequest', () => {
  it('reads JSON through the shared schema and returns the ETag', async () => {
    server.use(
      http.get('/api/v1/things/1', () =>
        HttpResponse.json(
          { id: '1', name: 'Band bar' },
          { headers: { ETag: '"3"' } },
        ),
      ),
    );

    const result = await apiRequest('/things/1', Thing);

    expect(result).toEqual({
      data: { id: '1', name: 'Band bar' },
      etag: '"3"',
    });
  });

  it('sends JSON, If-Match and a request id on a change', async () => {
    let seen: Request | undefined;
    server.use(
      http.patch('/api/v1/things/1', async ({ request }) => {
        seen = request.clone();
        return HttpResponse.json({ id: '1', name: 'Renamed' });
      }),
    );

    await apiRequest('/things/1', Thing, {
      method: 'PATCH',
      body: { name: 'Renamed' },
      ifMatch: '"3"',
    });

    expect(seen?.headers.get('content-type')).toBe('application/json');
    expect(seen?.headers.get('if-match')).toBe('"3"');
    expect(seen?.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(await seen?.json()).toEqual({ name: 'Renamed' });
  });

  it('turns a problem+json answer into an ApiError with its field errors', async () => {
    server.use(
      http.post('/api/v1/things', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'Some fields are invalid',
            errors: [{ path: 'name', message: 'Required' }],
            instance: '/api/v1/things',
          },
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );

    const error = await apiRequest('/things', Thing, {
      method: 'POST',
      body: {},
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: 'Some fields are invalid',
      problem: { errors: [{ path: 'name', message: 'Required' }] },
    });
  });

  it('still gives an ApiError when the error body is not a problem', async () => {
    server.use(
      http.get(
        '/api/v1/things/2',
        () => new HttpResponse('Bad gateway', { status: 502 }),
      ),
    );

    const error = await apiRequest('/things/2', Thing).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('refuses an answer that does not match the contract', async () => {
    server.use(
      http.get('/api/v1/things/3', () => HttpResponse.json({ id: 3 })),
    );

    const error = await apiRequest('/things/3', Thing).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({
      message: 'The API answered GET /things/3 with an unexpected shape',
    });
  });
});
