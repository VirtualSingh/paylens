import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../testing/msw';
import { renderRoute } from '../testing/render-route';

const owner = {
  id: '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a',
  email: 'owner@example.com',
  displayName: 'The Owner',
  role: 'admin',
  isDemo: false,
};
const notSignedIn = {
  type: 'about:blank',
  title: 'Unauthorized',
  status: 401,
  detail: 'Sign in to continue',
  instance: '/api/v1/auth/me',
};

/** Sign-in on, with a session that `signedIn` controls. */
function signInOn(state: { signedIn: boolean }, googleClientId: string | null) {
  server.use(
    http.get('/api/v1/auth/config', () =>
      HttpResponse.json({ authEnabled: true, googleClientId }),
    ),
    http.get('/api/v1/auth/me', () =>
      state.signedIn
        ? HttpResponse.json(owner)
        : HttpResponse.json(notSignedIn, { status: 401 }),
    ),
    http.post('/api/v1/auth/logout', () => {
      state.signedIn = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

describe('Session (ADR-014)', () => {
  it('shows the sign-in page, and nothing else, when sign-in is on and nobody is in', async () => {
    signInOn({ signedIn: false }, '1-test.apps.googleusercontent.com');
    renderRoute('/people');

    expect(
      await screen.findByRole('heading', { name: 'Sign in to PayLens' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Main' }),
    ).not.toBeInTheDocument();
  });

  it('shows who is signed in, and signs them out', async () => {
    signInOn({ signedIn: true }, '1-test.apps.googleusercontent.com');
    const { user } = renderRoute('/');

    expect(await screen.findByText('The Owner')).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Viewing as' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in to PayLens' }),
    ).toBeInTheDocument();
  });

  it('says what is missing when sign-in is on without a Google client', async () => {
    signInOn({ signedIn: false }, null);
    renderRoute('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no Google client is configured',
    );
  });
});
