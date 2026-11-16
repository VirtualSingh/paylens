import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MEHTA_ID, mehtaHistory, mehtaProfile } from '../../testing/fixtures';
import { server } from '../../testing/msw';
import { renderRoute } from '../../testing/render-route';

function answerProfile() {
  server.use(
    http.get(`/api/v1/employees/${MEHTA_ID}`, () =>
      HttpResponse.json(mehtaProfile, { headers: { ETag: '"3"' } }),
    ),
    http.get(`/api/v1/employees/${MEHTA_ID}/salary-history`, () =>
      HttpResponse.json(mehtaHistory),
    ),
  );
}

/** Records what the status endpoint was sent, answering with `answer`. */
function answerStatus(answer: () => Response) {
  const sent: { body: unknown; ifMatch: string | null }[] = [];
  server.use(
    http.post(`/api/v1/employees/${MEHTA_ID}/status`, async ({ request }) => {
      sent.push({
        body: await request.json(),
        ifMatch: request.headers.get('if-match'),
      });
      return answer();
    }),
  );
  return sent;
}

async function openSheet() {
  answerProfile();
  const view = renderRoute(`/people/${MEHTA_ID}`);
  await view.user.click(
    await screen.findByRole('button', { name: 'Change status' }),
  );
  const sheet = await screen.findByRole('dialog', {
    name: 'Change status — Aarav Mehta',
  });
  return { ...view, sheet: within(sheet) };
}

describe('Change status sheet', () => {
  beforeAll(async () => {
    await import('./employee-page');
  }, 30_000);

  it('puts someone on leave from a date, with the version it was opened at', async () => {
    const sent = answerStatus(() =>
      HttpResponse.json({ ...mehtaProfile, status: 'on_leave', version: 4 }),
    );
    const { user, sheet } = await openSheet();

    await user.click(sheet.getByRole('radio', { name: 'On leave' }));
    await user.type(sheet.getByLabelText('Effective date'), '2026-12-01');
    await user.click(sheet.getByRole('button', { name: 'Change status' }));

    expect(
      await screen.findByText('Status changed to On leave — from 1 Dec 2026'),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        body: { status: 'on_leave', effectiveDate: '2026-12-01' },
        ifMatch: '"3"',
      },
    ]);
  });

  it('asks for the employee code before a termination', async () => {
    const sent = answerStatus(() =>
      HttpResponse.json({ ...mehtaProfile, status: 'terminated', version: 4 }),
    );
    const { user, sheet } = await openSheet();

    await user.click(sheet.getByRole('radio', { name: 'Terminated' }));
    await user.type(sheet.getByLabelText('Effective date'), '2026-12-31');
    const terminate = sheet.getByRole('button', { name: 'Terminate' });
    expect(terminate).toBeDisabled();

    await user.type(
      sheet.getByLabelText('Type ACME-000001 to confirm'),
      'ACME-000001',
    );
    await user.click(terminate);

    await screen.findByText('Status changed to Terminated — from 31 Dec 2026');
    expect(sent[0]?.body).toEqual({
      status: 'terminated',
      effectiveDate: '2026-12-31',
    });
  });

  it('puts a broken rule next to the date', async () => {
    answerStatus(() =>
      HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Unprocessable Entity',
          status: 422,
          code: 'status_date_before_hire',
          detail: 'The date must be on or after the hire date, 2019-03-12',
          instance: `/api/v1/employees/${MEHTA_ID}/status`,
        },
        { status: 422 },
      ),
    );
    const { user, sheet } = await openSheet();

    await user.click(sheet.getByRole('radio', { name: 'On leave' }));
    await user.type(sheet.getByLabelText('Effective date'), '2019-01-01');
    await user.click(sheet.getByRole('button', { name: 'Change status' }));

    expect(
      await sheet.findByText(
        'The date must be on or after the hire date, 2019-03-12',
      ),
    ).toBeInTheDocument();
    expect(sheet.getByLabelText('Effective date')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
