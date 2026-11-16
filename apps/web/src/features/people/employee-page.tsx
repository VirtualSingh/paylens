import type {
  AuditEventJson,
  EmployeeProfile,
  SalaryRecordJson,
} from '@paylens/shared';
import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import { BandBar } from '../../components/band-bar';
import { MoneyText } from '../../components/money';
import { ErrorState } from '../../components/page-states';
import { Button } from '../../components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { useCanManagePay } from '../../lib/current-role';
import {
  formatDate,
  formatDateTime,
  PER_PERIOD,
  salaryChange,
} from '../../lib/format';
import {
  ACTION_LABELS,
  EMPLOYMENT_LABELS,
  FIELD_LABELS,
  GENDER_LABELS,
  REASON_LABELS,
  STATUS_LABELS,
} from '../../lib/labels';
import { useCountries } from '../../lib/lookups';
import { SalaryChangeSheet } from './salary-change-sheet';
import { StatusSheet } from './status-sheet';
import {
  useEmployee,
  useEmployeeAudit,
  useSalaryHistory,
} from './use-employee';

/**
 * What an HR manager can do to this person, each opening its sheet. "Change salary" is the
 * one primary action (ui.md principle 4); the others are quiet. A leaver has none: terminated
 * is final (ADR-013).
 */
function ProfileActions({
  profile,
  etag,
  countryName,
}: {
  profile: EmployeeProfile;
  etag: string;
  countryName: string;
}) {
  const [open, setOpen] = useState<'salary' | 'status' | null>(null);
  // The salary sheet needs the current record's start date for its hint; the tab loads it too.
  const history = useSalaryHistory(profile.id, true);
  const sheetProps = (sheet: 'salary' | 'status') => ({
    open: open === sheet,
    onOpenChange: (next: boolean) => setOpen(next ? sheet : null),
  });
  if (profile.status === 'terminated') {
    return null;
  }
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setOpen('status')}>
        Change status
      </Button>
      {profile.pay !== null && profile.pay !== undefined && (
        <Button onClick={() => setOpen('salary')}>Change salary</Button>
      )}
      <StatusSheet profile={profile} etag={etag} {...sheetProps('status')} />
      <SalaryChangeSheet
        profile={profile}
        etag={etag}
        history={history.data ?? []}
        countryName={countryName}
        {...sheetProps('salary')}
      />
    </div>
  );
}

/** One person (ui-screens.md §5): who they are, their pay against the band, and history. */
export function EmployeePage() {
  const { id = '' } = useParams();
  const canManagePay = useCanManagePay();
  const employee = useEmployee(id);
  const countries = useCountries();

  if (employee.isError) {
    return <ErrorState error={employee.error} />;
  }
  if (employee.data === undefined) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  const { profile, etag } = employee.data;
  const countryName =
    countries.data?.find((country) => country.code === profile.countryCode)
      ?.name ?? profile.countryCode;

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <Link to="/people" className="text-sm text-teal hover:underline">
        ← People
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl">
            {profile.firstName} {profile.lastName}
          </h1>
          {canManagePay && (
            <ProfileActions
              profile={profile}
              etag={etag}
              countryName={countryName}
            />
          )}
        </div>
        <p>
          {[
            profile.employeeCode,
            profile.department.name,
            profile.jobTitle,
            profile.levelCode,
            countryName,
          ].join(' · ')}
        </p>
        <p className="text-muted-foreground">
          {profile.manager !== null && (
            <span>
              Manager:{' '}
              <Link
                to={`/people/${profile.manager.id}`}
                className="text-teal hover:underline"
              >
                {profile.manager.name}
              </Link>
              {' · '}
            </span>
          )}
          <span>
            {[
              `Hired ${formatDate(profile.hireDate)}`,
              EMPLOYMENT_LABELS[profile.employmentType],
              STATUS_LABELS[profile.status],
            ].join(' · ')}
          </span>
        </p>
      </header>

      {profile.pay !== undefined && (
        <CurrentPay profile={profile} countryName={countryName} />
      )}

      <Tabs defaultValue={canManagePay ? 'history' : 'details'}>
        <TabsList>
          {canManagePay && (
            <TabsTrigger value="history">Salary history</TabsTrigger>
          )}
          <TabsTrigger value="details">Details</TabsTrigger>
          {canManagePay && <TabsTrigger value="audit">Audit</TabsTrigger>}
        </TabsList>
        {canManagePay && (
          <TabsContent value="history" className="pt-4">
            <SalaryHistory id={id} />
          </TabsContent>
        )}
        <TabsContent value="details" className="pt-4">
          <Details profile={profile} />
        </TabsContent>
        {canManagePay && (
          <TabsContent value="audit" className="pt-4">
            <AuditTimeline id={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function CurrentPay({
  profile,
  countryName,
}: {
  profile: EmployeeProfile;
  countryName: string;
}) {
  const pay = profile.pay;
  return (
    <section
      aria-labelledby="current-pay"
      className="flex flex-col gap-2 border-y border-line py-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="current-pay" className="text-md">
          Current pay
        </h2>
        {pay?.band !== null && pay?.band !== undefined && (
          <span className="text-sm text-muted-foreground">
            Band {profile.levelCode} · {countryName}
          </span>
        )}
      </div>
      {pay === null || pay === undefined ? (
        <p className="text-muted-foreground">
          No current salary (for example, after leaving).
        </p>
      ) : (
        <>
          <p className="text-lg">
            <MoneyText money={pay.salary} /> / {PER_PERIOD[pay.frequency]}
            {pay.annualReporting !== null && (
              <span className="ml-3 text-base text-muted-foreground">
                <MoneyText
                  money={pay.annualReporting.money}
                  approximate={{ asOf: pay.annualReporting.asOf }}
                />{' '}
                a year
              </span>
            )}
          </p>
          {pay.band !== null &&
            pay.bandPosition !== null &&
            pay.compaRatio !== null &&
            pay.rangePenetration !== null && (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  min <MoneyText money={pay.band.min} />
                </span>
                <BandBar
                  size="lg"
                  band={pay.band}
                  position={pay.bandPosition}
                  compaRatio={pay.compaRatio}
                  rangePenetration={pay.rangePenetration}
                />
                <span className="text-sm text-muted-foreground">
                  max <MoneyText money={pay.band.max} />
                </span>
                <span className="text-sm tabular-nums">
                  {`compa-ratio ${pay.compaRatio.toFixed(2)} · penetration ${Math.round(pay.rangePenetration * 100)}%`}
                </span>
              </div>
            )}
        </>
      )}
    </section>
  );
}

function SalaryHistory({ id }: { id: string }) {
  const history = useSalaryHistory(id, true);
  if (history.isError) {
    return <ErrorState error={history.error} />;
  }
  if (history.data === undefined) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  const records = history.data;
  return (
    <table className="w-full border-collapse text-base">
      <caption className="sr-only">Salary history</caption>
      <thead>
        <tr className="border-b border-line text-left text-muted-foreground">
          <th scope="col" className="h-9 px-3 font-medium">
            Effective from
          </th>
          <th scope="col" className="h-9 px-3 text-right font-medium">
            Salary
          </th>
          <th scope="col" className="h-9 px-3 font-medium">
            Reason
          </th>
          <th scope="col" className="h-9 px-3 text-right font-medium">
            Change
          </th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, index) => (
          <HistoryRow
            key={record.id}
            record={record}
            previous={records[index + 1]}
          />
        ))}
      </tbody>
    </table>
  );
}

function HistoryRow({
  record,
  previous,
}: {
  record: SalaryRecordJson;
  previous: SalaryRecordJson | undefined;
}) {
  // A record closed on its own first day was superseded by a correction (ADR-005).
  const superseded = record.effectiveTo === record.effectiveFrom;
  return (
    <tr
      className={`h-9 border-b border-line ${superseded ? 'text-muted-foreground line-through' : ''}`}
    >
      <td className="px-3 tabular-nums">{formatDate(record.effectiveFrom)}</td>
      <td className="px-3 text-right">
        <MoneyText money={record.salary} /> / {PER_PERIOD[record.frequency]}
      </td>
      <td className="px-3">
        {REASON_LABELS[record.reason]}
        {record.note !== null && (
          <span className="ml-2 text-muted-foreground">{record.note}</span>
        )}
      </td>
      <td className="px-3 text-right tabular-nums">
        {previous === undefined ? '' : salaryChange(previous, record)}
      </td>
    </tr>
  );
}

function Details({ profile }: { profile: EmployeeProfile }) {
  const rows: [string, ReactNode][] = [
    ['Work email', profile.workEmail],
    ['Job family', profile.jobFamily.name],
    ['Employment type', EMPLOYMENT_LABELS[profile.employmentType]],
    ['FTE', profile.fte],
    ['Hire date', formatDate(profile.hireDate)],
    [
      'Termination date',
      profile.terminationDate === null
        ? '—'
        : formatDate(profile.terminationDate),
    ],
  ];
  if (profile.gender !== undefined) {
    rows.push(['Gender', GENDER_LABELS[profile.gender]]);
  }
  return (
    <dl className="grid max-w-[720px] grid-cols-[200px_1fr] gap-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AuditTimeline({ id }: { id: string }) {
  const audit = useEmployeeAudit(id, true);
  if (audit.isError) {
    return <ErrorState error={audit.error} />;
  }
  if (audit.data === undefined) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (audit.data.data.length === 0) {
    return <p className="text-muted-foreground">No changes recorded yet.</p>;
  }
  return (
    <ol aria-label="Audit events" className="flex flex-col gap-4">
      {audit.data.data.map((event) => (
        <li key={event.id} className="border-l-2 border-line pl-4">
          <p className="font-medium">
            {ACTION_LABELS[event.action] ?? event.action}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(event.createdAt)}
            {event.actor !== null && ` · by ${event.actor.displayName}`}
          </p>
          <ul className="mt-1 text-sm">
            {fieldChanges(event).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** "Job title: Software Engineer → Senior Software Engineer" for each edited field. */
function fieldChanges(event: AuditEventJson): string[] {
  if (event.action !== 'employee.updated') {
    return [];
  }
  const before = asRecord(event.before);
  const after = asRecord(event.after);
  return Object.keys(after).map(
    (field) =>
      `${FIELD_LABELS[field] ?? field}: ${String(before[field] ?? '—')} → ${String(after[field] ?? '—')}`,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}
