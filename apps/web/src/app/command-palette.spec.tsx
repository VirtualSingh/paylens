import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import {
  directoryPage,
  MEHTA_ID,
  mehtaHistory,
  mehtaListItem,
  mehtaProfile,
} from '../testing/fixtures';
import { server } from '../testing/msw';
import { renderRoute } from '../testing/render-route';

describe('Command palette (⌘K)', () => {
  beforeAll(async () => {
    await import('../features/people/employee-page');
  }, 30_000);

  it('opens with Ctrl+K and goes to a section', async () => {
    const { user, router } = renderRoute('/');
    await screen.findByRole('navigation', { name: 'Main' });

    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', {
      name: 'Go to or find someone',
    });
    await user.type(within(palette).getByRole('combobox'), 'pay');
    await user.click(
      within(palette).getByRole('option', { name: 'Pay bands' }),
    );

    expect(router.state.location.pathname).toBe('/pay-bands');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('finds a person by name and opens their profile', async () => {
    server.use(
      http.get('/api/v1/employees', ({ request }) =>
        HttpResponse.json(
          directoryPage(
            new URL(request.url).searchParams.get('q') === 'meh'
              ? [mehtaListItem]
              : [],
          ),
        ),
      ),
      http.get(`/api/v1/employees/${MEHTA_ID}`, () =>
        HttpResponse.json(mehtaProfile),
      ),
      http.get(`/api/v1/employees/${MEHTA_ID}/salary-history`, () =>
        HttpResponse.json(mehtaHistory),
      ),
    );
    const { user, router } = renderRoute('/');
    await screen.findByRole('navigation', { name: 'Main' });

    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', {
      name: 'Go to or find someone',
    });
    await user.type(within(palette).getByRole('combobox'), 'meh');
    await user.click(
      await within(palette).findByRole('option', {
        name: 'Aarav Mehta ACME-000001',
      }),
    );
    await screen.findByRole('heading', { name: 'Aarav Mehta' });

    expect(router.state.location.pathname).toBe(`/people/${MEHTA_ID}`);
  });

  it('focuses the top-bar search when you press /', async () => {
    const { user } = renderRoute('/');
    const search = await screen.findByRole('searchbox', {
      name: 'Search people',
    });

    await user.keyboard('/');

    expect(search).toHaveFocus();
    expect(search).toHaveValue('');
  });
});
