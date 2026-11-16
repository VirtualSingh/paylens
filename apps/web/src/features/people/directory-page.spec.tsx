import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axeViolations } from '../../testing/axe';
import {
  directoryPage,
  guptaListItem,
  MEHTA_ID,
  mehtaHistory,
  mehtaListItem,
  mehtaProfile,
} from '../../testing/fixtures';
import { server } from '../../testing/msw';
import { renderRoute } from '../../testing/render-route';

/** Answers the directory and remembers the query string it was asked with. */
function answerDirectory(page = directoryPage()) {
  const asked: URLSearchParams[] = [];
  server.use(
    http.get('/api/v1/employees', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json(page);
    }),
  );
  return asked;
}

describe('People directory', () => {
  // Opening a lazy route the first time makes Vite transform that page's whole module graph,
  // which takes seconds while lint and typecheck share the CPU. Pay it once, here.
  beforeAll(async () => {
    await Promise.all([import('./directory-page'), import('./employee-page')]);
  }, 30_000);

  afterEach(() => localStorage.clear());

  it('lists people with their local salary, the converted figure and the band', async () => {
    answerDirectory();
    renderRoute('/people');

    const row = (await screen.findByText('Aarav Mehta')).closest('tr');

    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument();
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement);
    expect(cells.getByText('₹28,50,000')).toBeInTheDocument();
    expect(cells.getByText('≈ $34,337')).toBeInTheDocument();
    expect(
      cells.getByRole('img', { name: /^Within band · compa-ratio 0\.95/ }),
    ).toBeInTheDocument();
  });

  it('asks the API for what the URL says, in the reporting currency', async () => {
    const asked = answerDirectory();
    renderRoute(
      '/people?q=meh&country=IN&band=below&sort=annualReporting:desc&page=2',
    );
    await screen.findByText('Aarav Mehta');

    const query = asked.at(-1);
    expect(query?.get('q')).toBe('meh');
    expect(query?.getAll('country')).toEqual(['IN']);
    expect(query?.getAll('bandPosition')).toEqual(['below']);
    expect(query?.get('sort')).toBe('annualReporting:desc');
    expect(query?.get('page')).toBe('2');
    expect(query?.get('reportingCurrency')).toBe('USD');
  });

  it('sorts by a column header and says so to assistive technology', async () => {
    answerDirectory();
    const { user, router } = renderRoute('/people');
    await screen.findByText('Aarav Mehta');

    await user.click(screen.getByRole('button', { name: 'Name' }));

    expect(router.state.location.search).toBe('?sort=lastName%3Adesc');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('filters from the filter bar and goes back to the first page', async () => {
    answerDirectory();
    const { user, router } = renderRoute('/people?page=3');
    await screen.findByText('Aarav Mehta');

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Department' }),
      'ENG',
    );

    expect(router.state.location.search).toBe('?department=ENG');
  });

  it('shows viewers the directory without anyone’s pay', async () => {
    localStorage.setItem('paylens.devRole', 'viewer');
    const masked = [guptaListItem, mehtaListItem].map(
      ({ pay: _pay, ...rest }) => rest,
    );
    answerDirectory(directoryPage(masked));
    renderRoute('/people');
    await screen.findByText('Aarav Mehta');

    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    for (const payColumn of ['Salary', /Annual/, 'Band', 'Compa']) {
      expect(
        screen.queryByRole('columnheader', { name: payColumn }),
      ).not.toBeInTheDocument();
    }
  });

  it('opens a person’s profile from their row', async () => {
    answerDirectory();
    server.use(
      http.get(`/api/v1/employees/${MEHTA_ID}`, () =>
        HttpResponse.json(mehtaProfile),
      ),
      http.get(`/api/v1/employees/${MEHTA_ID}/salary-history`, () =>
        HttpResponse.json(mehtaHistory),
      ),
    );
    const { user, router } = renderRoute('/people');

    await user.click(await screen.findByText('Aarav Mehta'));
    // The profile's code loads lazily; the router moves once it has.
    await screen.findByRole('heading', { name: 'Aarav Mehta' });

    expect(router.state.location.pathname).toBe(`/people/${MEHTA_ID}`);
  });

  it('says when nobody matches and offers to clear the filters', async () => {
    answerDirectory(directoryPage([]));
    const { user, router } = renderRoute('/people?country=GB');
    const empty = await screen.findByRole('heading', {
      name: 'No one matches these filters',
    });

    // The empty state's own action (the filter bar has a "Clear filters" too).
    const section = empty.closest('section');
    expect(section).not.toBeNull();
    await user.click(
      within(section as HTMLElement).getByRole('button', {
        name: 'Clear filters',
      }),
    );

    expect(router.state.location.search).toBe('');
  });

  it('says when a salary is paid monthly', async () => {
    const monthly = {
      ...mehtaListItem,
      pay: mehtaListItem.pay && {
        ...mehtaListItem.pay,
        salary: { amountMinor: '15000000', currency: 'INR' },
        frequency: 'monthly' as const,
      },
    };
    answerDirectory(directoryPage([monthly]));
    renderRoute('/people');

    expect(await screen.findByText('₹1,50,000 / month')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    answerDirectory();
    const { container } = renderRoute('/people');
    await screen.findByText('Aarav Mehta');

    expect(await axeViolations(container)).toEqual([]);
  });
});
