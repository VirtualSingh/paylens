import type { AuditPage, EmployeeProfile } from '@paylens/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axeViolations } from '../../testing/axe';
import { MEHTA_ID, mehtaHistory, mehtaProfile } from '../../testing/fixtures';
import { server } from '../../testing/msw';
import { renderRoute } from '../../testing/render-route';

const audit: AuditPage = {
  data: [
    {
      id: '41',
      action: 'salary.changed',
      entityType: 'employee',
      entityId: MEHTA_ID,
      actor: null,
      before: null,
      after: null,
      requestId: 'req-1',
      createdAt: '2026-11-14T10:15:00.000Z',
    },
    {
      id: '40',
      action: 'employee.updated',
      entityType: 'employee',
      entityId: MEHTA_ID,
      actor: {
        id: '0e1d2c3b-4a59-4687-9a6b-5c4d3e2f1a0b',
        displayName: 'Priya Nair',
      },
      before: { jobTitle: 'Software Engineer' },
      after: { jobTitle: 'Senior Software Engineer' },
      requestId: 'req-0',
      createdAt: '2026-11-13T09:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 50,
  total: 2,
};

function answerProfile(profile: EmployeeProfile = mehtaProfile) {
  server.use(
    http.get(`/api/v1/employees/${MEHTA_ID}`, () =>
      HttpResponse.json(profile, { headers: { ETag: `"${profile.version}"` } }),
    ),
    http.get(`/api/v1/employees/${MEHTA_ID}/salary-history`, () =>
      HttpResponse.json(mehtaHistory),
    ),
    http.get(`/api/v1/employees/${MEHTA_ID}/audit`, () =>
      HttpResponse.json(audit),
    ),
  );
}

describe('Employee profile', () => {
  // Opening a lazy route the first time makes Vite transform that page's whole module graph,
  // which takes seconds while lint and typecheck share the CPU. Pay it once, here.
  beforeAll(async () => {
    await import('./employee-page');
  }, 30_000);

  afterEach(() => localStorage.clear());

  it('says who the person is and what they are paid, against their band', async () => {
    answerProfile();
    renderRoute(`/people/${MEHTA_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Aarav Mehta' }),
    ).toBeInTheDocument();
    // The country's name arrives with the countries lookup, which may answer after the profile.
    expect(
      await screen.findByText(
        'ACME-000001 · Engineering · Software Engineer · IC4 · India',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Hired 12 Mar 2019 · Full-time · Active'),
    ).toBeInTheDocument();
    const pay = screen.getByRole('region', { name: 'Current pay' });
    expect(within(pay).getByText('₹28,50,000')).toBeInTheDocument();
    expect(within(pay).getByText('≈ $34,337')).toBeInTheDocument();
    expect(
      within(pay).getByText('compa-ratio 0.95 · penetration 38%'),
    ).toBeInTheDocument();
    expect(
      within(pay).getByRole('img', { name: /^Within band/ }),
    ).toBeInTheDocument();
  });

  it('lists the salary history newest first, with the change from the record before', async () => {
    answerProfile();
    renderRoute(`/people/${MEHTA_ID}`);

    const history = await screen.findByRole('table', {
      name: 'Salary history',
    });
    const rows = within(history).getAllByRole('row').slice(1);

    expect(rows.map((row) => row.textContent)).toEqual([
      '1 Apr 2024₹28,50,000 / yearMerit+14.0%',
      '1 Apr 2022₹25,00,000 / yearHire',
    ]);
  });

  it('charts the history and says what the chart shows', async () => {
    answerProfile();
    renderRoute(`/people/${MEHTA_ID}`);

    const figure = await screen.findByRole('figure');

    expect(figure).toHaveTextContent(
      'Annual salary from ₹25,00,000 on 1 Apr 2022 to ₹28,50,000 on 1 Apr 2024, over 2 salaries.',
    );
  });

  it('shows who changed what on the audit tab', async () => {
    answerProfile();
    const { user } = renderRoute(`/people/${MEHTA_ID}`);

    await user.click(await screen.findByRole('tab', { name: 'Audit' }));

    // The audit loads when its tab opens.
    const timeline = await screen.findByRole('list', { name: 'Audit events' });
    expect(within(timeline).getByText('Details edited')).toBeInTheDocument();
    expect(
      within(timeline).getByText(
        'Job title: Software Engineer → Senior Software Engineer',
      ),
    ).toBeInTheDocument();
    expect(within(timeline).getByText(/Priya Nair/)).toBeInTheDocument();
  });

  it('shows viewers no pay, no salary history and no way to change it', async () => {
    localStorage.setItem('paylens.actingRole', 'viewer');
    const { pay: _pay, gender: _gender, ...masked } = mehtaProfile;
    answerProfile(masked);
    renderRoute(`/people/${MEHTA_ID}`);

    await screen.findByRole('heading', { name: 'Aarav Mehta' });

    expect(
      screen.queryByRole('region', { name: 'Current pay' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Salary history' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change salary' }),
    ).not.toBeInTheDocument();
  });

  it('says when there is nobody with that id', async () => {
    server.use(
      http.get(`/api/v1/employees/${MEHTA_ID}`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Not Found',
            status: 404,
            detail: 'There is no employee with this id',
            instance: `/api/v1/employees/${MEHTA_ID}`,
          },
          { status: 404 },
        ),
      ),
    );
    renderRoute(`/people/${MEHTA_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Not found' }),
    ).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    answerProfile();
    const { container } = renderRoute(`/people/${MEHTA_ID}`);
    await screen.findByRole('table', { name: 'Salary history' });

    expect(await axeViolations(container)).toEqual([]);
  });
});
