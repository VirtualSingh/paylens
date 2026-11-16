import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axeViolations } from '../testing/axe';
import { directoryPage } from '../testing/fixtures';
import { server } from '../testing/msw';
import { renderRoute } from '../testing/render-route';

describe('App shell', () => {
  // Opening a lazy route the first time makes Vite transform that page's whole module graph,
  // which takes seconds while lint and typecheck share the CPU. Pay it once, here.
  beforeAll(async () => {
    await import('../features/people/directory-page');
  }, 30_000);

  it('names the product', async () => {
    renderRoute('/');

    expect(await screen.findByText('PayLens')).toBeInTheDocument();
  });

  it('lists the main sections in the order of ui-screens.md', async () => {
    renderRoute('/');

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    const sections = within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(sections).toEqual([
      'Dashboard',
      'People',
      'Pay bands',
      'Imports',
      'Audit log',
      'Settings',
    ]);
  });

  it.each([
    ['Dashboard', '/'],
    ['People', '/people'],
    ['Pay bands', '/pay-bands'],
    ['Imports', '/imports'],
    ['Audit log', '/audit'],
    ['Settings', '/settings'],
  ])('links %s to %s', async (section, path) => {
    renderRoute('/');

    expect(await screen.findByRole('link', { name: section })).toHaveAttribute(
      'href',
      path,
    );
  });

  it('marks the section you are in', async () => {
    renderRoute('/pay-bands');

    expect(
      await screen.findByRole('link', { name: 'Pay bands' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('opens the directory filtered by what you type in the top-bar search', async () => {
    server.use(
      http.get('/api/v1/employees', () => HttpResponse.json(directoryPage())),
    );
    const { user, router } = renderRoute('/');

    await user.type(
      await screen.findByRole('searchbox', { name: 'Search people' }),
      'mehta{Enter}',
    );
    // The directory's code loads lazily; the router moves once it has.
    await screen.findByRole('heading', { name: 'People' });

    expect(router.state.location.pathname).toBe('/people');
    expect(router.state.location.search).toBe('?q=mehta');
  });

  it('offers every country currency as the reporting currency, USD first', async () => {
    const { user } = renderRoute('/');
    const select = await screen.findByRole('combobox', {
      name: 'Reporting currency',
    });

    await screen.findByRole('option', { name: 'INR' });
    await user.selectOptions(select, 'GBP');

    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['USD', 'GBP', 'INR']);
    expect(select).toHaveValue('GBP');
  });

  it('lets a developer act as any role until sign-in exists', async () => {
    renderRoute('/');

    const roles = await screen.findByRole('combobox', {
      name: 'Acting as (development only)',
    });

    expect(
      within(roles)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Viewer', 'HR manager', 'Admin']);
  });

  it('says so when a page does not exist', async () => {
    renderRoute('/nowhere');

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('gives page content its own main region', async () => {
    renderRoute('/');

    expect(await screen.findByRole('main')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderRoute('/');
    await screen.findByRole('option', { name: 'INR' });

    expect(await axeViolations(container)).toEqual([]);
  });
});
