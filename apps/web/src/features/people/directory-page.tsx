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
import {
  type FilterOption,
  MultiSelectFilter,
} from '../../components/multi-select-filter';
import { EmptyState, ErrorState } from '../../components/page-states';
import { Button } from '../../components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { STATUS_LABELS } from '../../lib/labels';
import { usePreference } from '../../lib/preferences';
import { useCanManagePay } from '../../lib/session';
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

const BAND_LABELS: Record<(typeof BAND_POSITIONS)[number], string> = {
  below: 'Below band',
  within: 'Within band',
  above: 'Above band',
};
const PAGE_SIZES = [25, 50, 100] as const;

type Density = 'compact' | 'comfortable';
const DENSITIES: readonly Density[] = ['compact', 'comfortable'];

/** The people directory (ui-screens.md §4): server-side search, filters, sort and paging. */
export function DirectoryPage() {
  const [search, setSearch] = useSearchParams();
  const query = useMemo(() => readDirectoryQuery(search), [search]);
  const directory = useDirectory(query);
  const navigate = useNavigate();
  const columns = useDirectoryColumns();
  const canManagePay = useCanManagePay();
  const [adding, setAdding] = useState(false);
  const [hidden, setHidden] = usePreference<string[]>(
    'paylens.directory.hidden',
    [],
    (stored) =>
      Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === 'string')
        : undefined,
  );
  const [density, setDensity] = usePreference<Density>(
    'paylens.directory.density',
    'compact',
    (stored) => DENSITIES.find((option) => option === stored),
  );

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

  /** Adds or removes one value of a multi-value filter, and starts again at page 1. */
  function toggle(key: FilterKey, value: string) {
    setSearch((current) => {
      const next = new URLSearchParams(current);
      const values = next.getAll(key);
      next.delete(key);
      const kept = values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value];
      for (const item of kept) {
        next.append(key, item);
      }
      next.delete('page');
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
        onSearch={(text) => update({ q: text })}
        onToggle={toggle}
        onClear={() =>
          update(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])))
        }
        hasFilters={hasFilters}
      />

      <TableTools
        columns={columns
          .filter((column) => column.id !== 'name')
          .map((column) => ({
            id: column.id ?? '',
            label: typeof column.header === 'string' ? column.header : '',
          }))}
        hidden={hidden}
        onHiddenChange={setHidden}
        density={density}
        onDensityChange={setDensity}
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
            hiddenColumns={hidden}
            density={density}
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

interface FilterDefinition {
  readonly key: Exclude<FilterKey, 'q'>;
  readonly label: string;
  readonly options: readonly FilterOption[];
}

/** The directory's filters and their choices; the popovers and the chips share them. */
function useFilterDefinitions(): FilterDefinition[] {
  const countries = useCountries();
  const departments = useDepartments();
  const levels = useJobLevels();
  return [
    {
      key: 'country',
      label: 'Country',
      options: (countries.data ?? []).map((c) => ({
        value: c.code,
        label: c.name,
      })),
    },
    {
      key: 'department',
      label: 'Department',
      options: (departments.data ?? []).map((d) => ({
        value: d.code,
        label: d.name,
      })),
    },
    {
      key: 'level',
      label: 'Level',
      options: (levels.data ?? []).map((l) => ({
        value: l.code,
        label: l.code,
      })),
    },
    {
      key: 'status',
      label: 'Status',
      options: EMPLOYEE_STATUSES.map((s) => ({
        value: s,
        label: STATUS_LABELS[s],
      })),
    },
    {
      key: 'band',
      label: 'Band',
      options: BAND_POSITIONS.map((b) => ({ value: b, label: BAND_LABELS[b] })),
    },
  ];
}

/** Search, the multi-select filters, and a chip per chosen value (ui.md → FilterBar). */
function FilterBar({
  search,
  onSearch,
  onToggle,
  onClear,
  hasFilters,
}: {
  search: URLSearchParams;
  onSearch: (text: string) => void;
  onToggle: (key: FilterKey, value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  const definitions = useFilterDefinitions();
  const [text, setText] = useState(search.get('q') ?? '');

  // Typing waits 300 ms before searching, so the API is asked once per pause, not per key.
  const urlText = search.get('q') ?? '';
  useEffect(() => {
    if (text.trim() === urlText) {
      return undefined;
    }
    const timer = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, urlText, onSearch]);
  useEffect(() => setText(urlText), [urlText]);

  const chips = definitions.flatMap((definition) =>
    search.getAll(definition.key).map((value) => ({
      key: definition.key,
      value,
      text: `${definition.label}: ${
        definition.options.find((option) => option.value === value)?.label ??
        value
      }`,
    })),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          aria-label="Search by name, code or email"
          placeholder="Search by name, code or email"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="mr-2 h-8 w-72 rounded-md border border-line bg-surface px-3"
        />
        {definitions.map((definition) => (
          <MultiSelectFilter
            key={definition.key}
            label={definition.label}
            options={definition.options}
            selected={search.getAll(definition.key)}
            onToggle={(value) => onToggle(definition.key, value)}
          />
        ))}
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="ml-2 text-sm text-teal underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={`${chip.key}=${chip.value}`}>
              <button
                type="button"
                aria-label={`Remove ${chip.text}`}
                onClick={() => onToggle(chip.key, chip.value)}
                className="flex h-7 items-center gap-1 rounded-full bg-teal-soft px-3 text-sm hover:bg-teal-soft/70"
              >
                {chip.text}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Columns and density: display choices kept in this browser (ui.md → DataTable). */
function TableTools({
  columns,
  hidden,
  onHiddenChange,
  density,
  onDensityChange,
}: {
  columns: readonly { id: string; label: string }[];
  hidden: readonly string[];
  onHiddenChange: (hidden: string[]) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Columns <span aria-hidden="true">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-2">
          <fieldset className="flex flex-col gap-0.5">
            <legend className="sr-only">Columns shown</legend>
            {columns.map((column) => (
              <label
                key={column.id}
                className="flex h-8 items-center gap-2 rounded-md px-2 hover:bg-teal-soft"
              >
                <input
                  type="checkbox"
                  checked={!hidden.includes(column.id)}
                  onChange={() =>
                    onHiddenChange(
                      hidden.includes(column.id)
                        ? hidden.filter((id) => id !== column.id)
                        : [...hidden, column.id],
                    )
                  }
                />
                {column.label}
              </label>
            ))}
          </fieldset>
        </PopoverContent>
      </Popover>
      <div role="group" aria-label="Row density" className="flex">
        {DENSITIES.map((option) => (
          <Button
            key={option}
            variant={density === option ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={density === option}
            onClick={() => onDensityChange(option)}
          >
            {option === 'compact' ? 'Compact rows' : 'Comfortable rows'}
          </Button>
        ))}
      </div>
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
