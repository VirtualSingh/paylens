import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowData,
  useReactTable,
} from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // Per-column settings the table reads (TanStack's documented extension point).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** The API's sort field; set only on sortable columns. */
    readonly sortField?: string;
    /** Numbers are right-aligned with tabular figures (ui.md → typography). */
    readonly numeric?: boolean;
  }
}

export interface SortState {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * The headless TanStack table in server mode (ui.md → DataTable): the server sorts and pages,
 * this renders headers as sort buttons with `aria-sort`, and rows that open on click.
 */
export function DataTable<Row>({
  caption,
  columns,
  data,
  sort,
  onSort,
  onOpenRow,
  getRowId,
  busy = false,
  hiddenColumns = [],
  density = 'compact',
}: {
  caption: string;
  columns: ColumnDef<Row>[];
  data: Row[];
  sort: SortState | undefined;
  onSort: (field: string) => void;
  onOpenRow: (row: Row) => void;
  getRowId: (row: Row) => string;
  busy?: boolean;
  /** Column ids the reader chose to hide (column chooser). */
  hiddenColumns?: readonly string[];
  /** 36 px rows (compact) or 40 px (comfortable), ui.md → density. */
  density?: 'compact' | 'comfortable';
}) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: {
      columnVisibility: Object.fromEntries(
        hiddenColumns.map((id) => [id, false]),
      ),
    },
  });

  return (
    <table
      className="w-full border-collapse bg-surface text-base"
      aria-busy={busy}
      data-density={density}
    >
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 z-10 bg-surface">
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id} className="border-b border-line">
            {group.headers.map((header) => {
              const { sortField, numeric } = header.column.columnDef.meta ?? {};
              const sorted =
                sortField !== undefined && sort?.field === sortField
                  ? sort.direction
                  : undefined;
              const label = flexRender(
                header.column.columnDef.header,
                header.getContext(),
              );
              return (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={
                    sorted === undefined
                      ? undefined
                      : sorted === 'asc'
                        ? 'ascending'
                        : 'descending'
                  }
                  className={`h-9 px-3 font-medium text-muted-foreground ${numeric === true ? 'text-right' : 'text-left'}`}
                >
                  {sortField === undefined ? (
                    label
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSort(sortField)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {label}
                      <span aria-hidden="true" className="text-xs">
                        {sorted === 'asc' ? '▴' : sorted === 'desc' ? '▾' : ''}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onOpenRow(row.original)}
            className={`${density === 'compact' ? 'h-9' : 'h-10'} cursor-pointer border-b border-line hover:bg-teal-soft/50`}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className={`px-3 ${cell.column.columnDef.meta?.numeric === true ? 'text-right tabular-nums' : ''}`}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
