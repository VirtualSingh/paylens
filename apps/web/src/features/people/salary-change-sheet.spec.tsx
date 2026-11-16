import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axeViolations } from '../../testing/axe';
import { MEHTA_ID, mehtaHistory, mehtaProfile } from '../../testing/fixtures';
import { server } from '../../testing/msw';
import { renderRoute } from '../../testing/render-route';

const problem = (status: number, extra: object) => ({
  type: 'about:blank',
  title: 'Error',
  status,
  instance: `/api/v1/employees/${MEHTA_ID}/salary-changes`,
  ...extra,
});

function answerProfile() {
  server.use(
    http.get(`/api/v1/employees/${MEHTA_ID}`, () =>
      HttpResponse.json(mehtaProfile, { headers: { ETag: '"3"' } }),
    ),
    http.get(`/api/v1/employees/${MEHTA_ID}/salary-history`, () =>
      HttpResponse.json(mehtaHistory),
    ),
    http.get(`/api/v1/employees/${MEHTA_ID}/audit`, () =>
      HttpResponse.json({ data: [], page: 1, pageSize: 50, total: 0 }),
    ),
  );
}

/** Opens the sheet on Aarav Mehta's profile (₹28,50,000 a year; band ₹24L/30L/36L). */
async function openSheet() {
  answerProfile();
  const view = renderRoute(`/people/${MEHTA_ID}`);
  await view.user.click(
    await screen.findByRole('button', { name: 'Change salary' }),
  );
  const sheet = await screen.findByRole('dialog', {
    name: 'Change salary — Aarav Mehta',
  });
  return { ...view, sheet: within(sheet) };
}

describe('Change salary sheet', () => {
  beforeAll(async () => {
    await import('./employee-page');
  }, 30_000);

  it('previews the change with the same band maths as the server', async () => {
    const { user, sheet } = await openSheet();

    await user.type(sheet.getByLabelText('New salary'), '31,00,000');

    expect(sheet.getByText('+₹2,50,000 · +8.8%')).toBeInTheDocument();
    expect(
      sheet.getByText('compa-ratio 0.95 → 1.03 · within band'),
    ).toBeInTheDocument();
    expect(sheet.getByText('Must be after 1 Apr 2024')).toBeInTheDocument();
  });

  it('records the change with the version it was opened at, then says so', async () => {
    let sent: { body: unknown; ifMatch: string | null } | undefined;
    server.use(
      http.post(
        `/api/v1/employees/${MEHTA_ID}/salary-changes`,
        async ({ request }) => {
          sent = {
            body: await request.json(),
            ifMatch: request.headers.get('if-match'),
          };
          return HttpResponse.json(
            {
              record: { ...mehtaHistory[0], effectiveFrom: '2027-01-01' },
              pay: mehtaProfile.pay,
              version: 4,
            },
            { status: 201 },
          );
        },
      ),
    );
    const { user, sheet } = await openSheet();

    await user.type(sheet.getByLabelText('Effective from'), '2027-01-01');
    await user.type(sheet.getByLabelText('New salary'), '3100000');
    await user.click(sheet.getByRole('radio', { name: 'Promotion' }));
    await user.type(sheet.getByLabelText('Note'), 'Promoted to Senior');
    await user.click(sheet.getByRole('button', { name: 'Record change' }));

    expect(
      await screen.findByText('Salary change recorded — effective 1 Jan 2027'),
    ).toBeInTheDocument();
    expect(sent).toEqual({
      body: {
        effectiveFrom: '2027-01-01',
        amount: { amountMinor: '310000000', currency: 'INR' },
        frequency: 'annual',
        reason: 'promotion',
        note: 'Promoted to Senior',
      },
      ifMatch: '"3"',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explains when someone changed the person meanwhile, and offers a reload', async () => {
    server.use(
      http.post(`/api/v1/employees/${MEHTA_ID}/salary-changes`, () =>
        HttpResponse.json(
          problem(409, {
            detail:
              'This record changed since you opened it. Reload to continue.',
          }),
          { status: 409 },
        ),
      ),
    );
    const { user, sheet } = await openSheet();

    await user.type(sheet.getByLabelText('Effective from'), '2027-01-01');
    await user.type(sheet.getByLabelText('New salary'), '3100000');
    await user.click(sheet.getByRole('button', { name: 'Record change' }));

    expect(await sheet.findByRole('alert')).toHaveTextContent(
      'This record changed since you opened it. Reload to continue.',
    );
    expect(sheet.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('puts a broken rule next to the field it is about', async () => {
    server.use(
      http.post(`/api/v1/employees/${MEHTA_ID}/salary-changes`, () =>
        HttpResponse.json(
          problem(422, {
            code: 'effective_date_not_after_current',
            detail:
              'Effective date must be after 2024-04-01, when the current salary started',
          }),
          { status: 422 },
        ),
      ),
    );
    const { user, sheet } = await openSheet();

    await user.type(sheet.getByLabelText('Effective from'), '2024-01-01');
    await user.type(sheet.getByLabelText('New salary'), '3100000');
    await user.click(sheet.getByRole('button', { name: 'Record change' }));

    const date = sheet.getByLabelText('Effective from');
    expect(
      await sheet.findByText(
        'Effective date must be after 2024-04-01, when the current salary started',
      ),
    ).toBeInTheDocument();
    expect(date).toHaveAttribute('aria-invalid', 'true');
  });

  it('checks the form before sending anything', async () => {
    let calls = 0;
    server.use(
      http.post(`/api/v1/employees/${MEHTA_ID}/salary-changes`, () => {
        calls += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user, sheet } = await openSheet();

    await user.type(sheet.getByLabelText('Effective from'), '2027-01-01');
    await user.click(sheet.getByRole('button', { name: 'Record change' }));

    expect(
      await sheet.findByText('Enter the new salary, e.g. 31,00,000'),
    ).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('has no detectable accessibility violations', async () => {
    await openSheet();

    expect(await axeViolations(document.body)).toEqual([]);
  });
});
