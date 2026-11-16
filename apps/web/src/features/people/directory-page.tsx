import {
  BAND_POSITIONS,
  EMPLOYEE_SORT_FIELDS,
  EMPLOYEE_STATUSES,
  type EmployeeListItem,
} from '@paylens/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BandBar } from '../../components/band-bar';
import { DataTable } from '../../components/data-table';
import { formatMoney, MoneyText } from '../../components/money';
import { EmptyState, ErrorState } from '../../components/page-states';
import { Button } from '../../components/ui/button';
import { useCanManagePay } from '../../lib/current-role';
import { useCountries, useDepartments, useJobLevels } from '../../lib/lookups';
import { useReportingCurrency } from '../../lib/reporting-currency';
import {
  FILTER_KEYS,
  type FilterKey,
  nextSort,
  readDirectoryQuery,
} from './directory-params';
import { AddEmployeeSheet } from './add-employee-sheet';
import { useDirectory } from './use-directory';

const STATUS_LABELS: Record<(typeof EMPLOYEE_STATUSES)[number], string> = {
  active: 'Active',
  on_leave: 'On leave',
  terminated: 'Terminated',
};
const BAND_LABELS: Record<(typeof BAND_POSITIONS)[number], string> = {
  below: 'Below band',
  within: 'Within band',
  above: 'Above band',
};
const PAGE_SIZES = [25, 50, 100] as const;

/** The people directory (ui-screens.md §4): server-side search, filters, sort and paging. */
export function DirectoryPage() {
  const [search, setSearch] = useSearchParams();
  const query = useMemo(() => readDirectoryQuery(search), [search]);
  const directory = useDirectory(query);
  const navigate = useNavigate();
  const columns = useDirectoryColumns();
  const canManagePay = useCanManagePay();
  const [adding, setAdding] = useState(false);

  /** Changes some parameters; any change but paging itself starts again at page 1. */
  function update(changes: Record<string, string | undefined>) {
    setSearch((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (!('page' in changes)) {
        next.delete('page');
      }
      return next;
    });
  }

  const page = directory.data;
  const first = page === undefined ? 0 : (page.page - 1) * page.pageSize + 1;
  const last = page === undefined ? 0 : first + page.data.length - 1;
  const hasFilters = FILTER_KEYS.some((key) => search.has(key));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl">People</h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">
            {page === undefined
              ? 'Loading people…'
              : page.total === 0
                ? 'No matches'
                : `Showing ${first.toLocaleString('en-US')}–${last.toLocaleString('en-US')} of ${page.total.toLocaleString('en-US')}`}
          </p>
        </div>
        {canManagePay && (
          <>
            <Button onClick={() => setAdding(true)}>
              <span aria-hidden="true">+</span> Add employee
            </Button>
            <AddEmployeeSheet open={adding} onOpenChange={setAdding} />
          </>
        )}
      </header>

      <FilterBar
        search={search}
        onChange={(key, value) => update({ [key]: value })}
        onClear={() =>
          update(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])))
        }
        hasFilters={hasFilters}
      />

      {directory.isError ? (
        <ErrorState error={directory.error} />
      ) : page !== undefined && page.total === 0 ? (
        <EmptyState
          title="No one matches these filters"
          action={
            <button
              type="button"
              className="text-teal underline-offset-4 hover:underline"
              onClick={() =>
                update(
                  Object.fromEntries(
                    FILTER_KEYS.map((key) => [key, undefined]),
                  ),
                )
              }
            >
              Clear filters
            </button>
          }
        >
          Widen the search or remove a filter.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <DataTable
            caption="People"
            columns={columns}
            data={page?.data ?? []}
            busy={directory.isFetching}
            sort={query.sort[0]}
            onSort={(field) => {
              const known = EMPLOYEE_SORT_FIELDS.find((f) => f === field);
              if (known !== undefined) {
                update({ sort: nextSort(query.sort, known) });
              }
            }}
            onOpenRow={(row) => navigate(`/people/${row.id}`)}
            getRowId={(row) => row.id}
          />
        </div>
      )}

      {page !== undefined && page.total > 0 && (
        <Pagination
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          onPage={(next) => update({ page: String(next) })}
          onPageSize={(size) => update({ pageSize: String(size) })}
        />
      )}
    </div>
  );
}

function useDirectoryColumns(): ColumnDef<EmployeeListItem>[] {
  const canManagePay = useCanManagePay();
  const { currency } = useReportingCurrency();
  return useMemo(() => {
    const people: ColumnDef<EmployeeListItem>[] = [
      {
        id: 'name',
        header: 'Name',
        meta: { sortField: 'lastName' },
        cell: ({ row }) => (
          <Link
            to={`/people/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.firstName} {row.original.lastName}
          </Link>
        ),
      },
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => row.original.employeeCode,
      },
      {
        id: 'country',
        header: 'Country',
        meta: { sortField: 'country' },
        cell: ({ row }) => row.original.countryCode,
      },
      {
        id: 'department',
        header: 'Department',
        meta: { sortField: 'department' },
        cell: ({ row }) => row.original.department.name,
      },
      {
        id: 'level',
        header: 'Level',
        meta: { sortField: 'level' },
        cell: ({ row }) => row.original.levelCode,
      },
    ];
    if (!canManagePay) {
      return people;
    }
    const pay: ColumnDef<EmployeeListItem>[] = [
      {
        id: 'salary',
        header: 'Salary',
        meta: { numeric: true },
        cell: ({ row }) => {
          const salary = row.original.pay;
          // As recorded; most Indian salaries are monthly, so the period is said.
          return salary === null || salary === undefined ? (
            '—'
          ) : (
            <span className="tabular-nums">
              {formatMoney(salary.salary)}
              {salary.frequency === 'monthly' ? ' / month' : ''}
            </span>
          );
        },
      },
      {
        id: 'annualReporting',
        header: `≈ Annual (${currency})`,
        meta: { sortField: 'annualReporting', numeric: true },
        cell: ({ row }) => {
          const reporting = row.original.pay?.annualReporting;
          return reporting === null || reporting === undefined ? (
            '—'
          ) : (
            <MoneyText
              money={reporting.money}
              approximate={{ asOf: reporting.asOf }}
            />
          );
        },
      },
      {
        id: 'band',
        header: 'Band',
        cell: ({ row }) => {
          const pay = row.original.pay;
          return pay?.band === null ||
            pay?.band === undefined ||
            pay.bandPosition === null ||
            pay.compaRatio === null ||
            pay.rangePenetration === null ? (
            '—'
          ) : (
            <BandBar
              band={pay.band}
              position={pay.bandPosition}
              compaRatio={pay.compaRatio}
              rangePenetration={pay.rangePenetration}
            />
          );
        },
      },
      {
        id: 'compaRatio',
        header: 'Compa',
        meta: { sortField: 'compaRatio', numeric: true },
        cell: ({ row }) => {
          const compa = row.original.pay?.compaRatio;
          return compa === null || compa === undefined ? '—' : compa.toFixed(2);
        },
      },
    ];
    return [...people, ...pay];
  }, [canManagePay, currency]);
}

function FilterBar({
  search,
  onChange,
  onClear,
  hasFilters,
}: {
  search: URLSearchParams;
  onChange: (key: FilterKey, value: string | undefined) => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  const countries = useCountries();
  const departments = useDepartments();
  const levels = useJobLevels();
  const [text, setText] = useState(search.get('q') ?? '');

  // Typing waits 300 ms before searching, so the API is asked once per pause, not per key.
  const urlText = search.get('q') ?? '';
  useEffect(() => {
    if (text.trim() === urlText) {
      return undefined;
    }
    const timer = setTimeout(() => onChange('q', text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, urlText, onChange]);
  useEffect(() => setText(urlText), [urlText]);

  const filter = (
    key: FilterKey,
    label: string,
    options: readonly { value: string; label: string }[],
  ) => (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      {label}
      <select
        className="h-8 rounded-md border border-line bg-surface px-2 text-base text-ink"
        value={search.get(key) ?? ''}
        onChange={(event) => onChange(key, event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-wrap items-center gap-4">
      <input
        type="search"
        aria-label="Search by name, code or email"
        placeholder="Search by name, code or email"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="h-8 w-72 rounded-md border border-line bg-surface px-3"
      />
      {filter(
        'country',
        'Country',
        (countries.data ?? []).map((c) => ({ value: c.code, label: c.name })),
      )}
      {filter(
        'department',
        'Department',
        (departments.data ?? []).map((d) => ({ value: d.code, label: d.name })),
      )}
      {filter(
        'level',
        'Level',
        (levels.data ?? []).map((l) => ({ value: l.code, label: l.code })),
      )}
      {filter(
        'status',
        'Status',
        EMPLOYEE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
      )}
      {filter(
        'band',
        'Band',
        BAND_POSITIONS.map((b) => ({ value: b, label: BAND_LABELS[b] })),
      )}
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-teal underline-offset-4 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const buttonClass =
    'h-8 rounded-md border border-line bg-surface px-3 disabled:opacity-50';
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-end gap-3 text-sm"
    >
      <span className="text-muted-foreground tabular-nums">
        Page {page} of {pages.toLocaleString('en-US')}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
      <label className="flex items-center gap-2 text-muted-foreground">
        Rows per page
        <select
          className="h-8 rounded-md border border-line bg-surface px-2 text-ink"
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </label>
    </nav>
  );
}
