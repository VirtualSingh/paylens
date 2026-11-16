import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import {
  directoryPage,
  MEHTA_ID,
  mehtaHistory,
  mehtaListItem,
  mehtaProfile,
} from '../../testing/fixtures';
import { server } from '../../testing/msw';
import { renderRoute } from '../../testing/render-route';

const LIAM_ID = '9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const NEW_ID = '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a';

function answerProfile(id = MEHTA_ID, profile = mehtaProfile) {
  server.use(
    http.get(`/api/v1/employees/${id}`, () =>
      HttpResponse.json(profile, { headers: { ETag: `"${profile.version}"` } }),
    ),
    http.get(`/api/v1/employees/${id}/salary-history`, () =>
      HttpResponse.json(mehtaHistory),
    ),
  );
}

/** Answers the manager lookup: a search by employee code finds Liam Smith, nothing else. */
function answerManagerSearch() {
  server.use(
    http.get('/api/v1/employees', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      return HttpResponse.json(
        directoryPage(
          q === 'ACME-000006'
            ? [
                {
                  ...mehtaListItem,
                  id: LIAM_ID,
                  employeeCode: 'ACME-000006',
                  firstName: 'Liam',
                  lastName: 'Smith',
                },
              ]
            : [],
        ),
      );
    }),
  );
}

function recordPatches() {
  const sent: { body: unknown; ifMatch: string | null }[] = [];
  server.use(
    http.patch(`/api/v1/employees/${MEHTA_ID}`, async ({ request }) => {
      sent.push({
        body: await request.json(),
        ifMatch: request.headers.get('if-match'),
      });
      return HttpResponse.json({ ...mehtaProfile, version: 4 });
    }),
  );
  return sent;
}

describe('Edit details sheet', () => {
  beforeAll(async () => {
    await import('./employee-page');
  }, 30_000);

  async function openEdit() {
    answerProfile();
    const view = renderRoute(`/people/${MEHTA_ID}`);
    await view.user.click(
      await screen.findByRole('button', { name: 'Edit details' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Edit details — Aarav Mehta',
    });
    await within(sheet).findByDisplayValue('Software Engineer');
    return { ...view, sheet: within(sheet) };
  }

  it('saves only what changed, with the version it was opened at', async () => {
    const sent = recordPatches();
    const { user, sheet } = await openEdit();

    const title = sheet.getByLabelText('Job title');
    await user.clear(title);
    await user.type(title, 'Staff Engineer');
    await user.click(sheet.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(sent).toEqual([
      { body: { jobTitle: 'Staff Engineer' }, ifMatch: '"3"' },
    ]);
  });

  it('finds the new manager by their employee code', async () => {
    const sent = recordPatches();
    answerManagerSearch();
    const { user, sheet } = await openEdit();

    await user.type(
      sheet.getByLabelText('Manager’s employee code'),
      'ACME-000006',
    );
    await user.click(sheet.getByRole('button', { name: 'Save details' }));

    await screen.findByText('Details saved');
    expect(sent[0]?.body).toEqual({ managerId: LIAM_ID });
  });

  it('says when nobody has that manager code, and sends nothing', async () => {
    const sent = recordPatches();
    answerManagerSearch();
    const { user, sheet } = await openEdit();

    await user.type(
      sheet.getByLabelText('Manager’s employee code'),
      'ACME-999999',
    );
    await user.click(sheet.getByRole('button', { name: 'Save details' }));

    expect(
      await sheet.findByText('There is no current employee with this code'),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);
  });
});

describe('Add employee sheet', () => {
  beforeAll(async () => {
    await Promise.all([import('./directory-page'), import('./employee-page')]);
  }, 30_000);

  async function openAdd(role = 'hr_manager') {
    localStorage.setItem('paylens.devRole', role);
    server.use(
      http.get('/api/v1/employees', () => HttpResponse.json(directoryPage())),
    );
    const view = renderRoute('/people');
    await screen.findByText('Aarav Mehta');
    return view;
  }

  afterEach(() => localStorage.clear());

  it('adds a person with their hire salary, then opens their profile', async () => {
    let sent: unknown;
    server.use(
      http.post('/api/v1/employees', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          {
            ...mehtaProfile,
            id: NEW_ID,
            employeeCode: 'ACME-000013',
            version: 1,
          },
          { status: 201, headers: { ETag: '"1"' } },
        );
      }),
    );
    answerProfile(NEW_ID, { ...mehtaProfile, id: NEW_ID });
    const { user, router } = await openAdd();

    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    const sheet = within(
      await screen.findByRole('dialog', { name: 'Add employee' }),
    );
    await sheet.findByRole('option', { name: 'India' });
    await user.type(sheet.getByLabelText('First name'), 'Kavya');
    await user.type(sheet.getByLabelText('Last name'), 'Iyer');
    await user.type(sheet.getByLabelText('Work email'), 'kavya.iyer@acme.test');
    await user.selectOptions(sheet.getByLabelText('Country'), 'IN');
    await user.selectOptions(sheet.getByLabelText('Department'), 'ENG');
    await user.selectOptions(sheet.getByLabelText('Job family'), 'SWE');
    await user.selectOptions(sheet.getByLabelText('Level'), 'IC3');
    await user.type(sheet.getByLabelText('Job title'), 'Software Engineer');
    await user.selectOptions(sheet.getByLabelText('Gender'), 'female');
    await user.type(sheet.getByLabelText('Hire date'), '2026-11-02');
    await user.type(sheet.getByLabelText('Starting salary'), '20,00,000');
    await user.click(sheet.getByRole('button', { name: 'Add employee' }));

    expect(
      await screen.findByText('Employee added — ACME-000013'),
    ).toBeInTheDocument();
    expect(sent).toEqual({
      firstName: 'Kavya',
      lastName: 'Iyer',
      workEmail: 'kavya.iyer@acme.test',
      countryCode: 'IN',
      departmentCode: 'ENG',
      jobFamilyCode: 'SWE',
      levelCode: 'IC3',
      jobTitle: 'Software Engineer',
      managerId: null,
      employmentType: 'full_time',
      fte: '1',
      hireDate: '2026-11-02',
      gender: 'female',
      salary: {
        amount: { amountMinor: '200000000', currency: 'INR' },
        frequency: 'annual',
      },
    });
    await screen.findByRole('heading', { name: 'Aarav Mehta' });
    expect(router.state.location.pathname).toBe(`/people/${NEW_ID}`);
  });

  it('checks the required fields before sending anything', async () => {
    let calls = 0;
    server.use(
      http.post('/api/v1/employees', () => {
        calls += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = await openAdd();

    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    const sheet = within(
      await screen.findByRole('dialog', { name: 'Add employee' }),
    );
    await sheet.findByRole('option', { name: 'India' });
    await user.click(sheet.getByRole('button', { name: 'Add employee' }));

    expect(await sheet.findByText('Enter a first name')).toBeInTheDocument();
    expect(sheet.getByText('Choose a country')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('is offered to HR managers only', async () => {
    await openAdd('viewer');

    expect(
      screen.queryByRole('button', { name: 'Add employee' }),
    ).not.toBeInTheDocument();
  });
});
