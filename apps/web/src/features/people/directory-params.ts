import {
  type EmployeeDirectoryQuery,
  EmployeeDirectoryQuerySchema,
  type EmployeeSortField,
} from '@paylens/shared';

/** URL names (ui-screens.md §4) → API names, where they differ. */
const URL_TO_API: Readonly<Record<string, string>> = { band: 'bandPosition' };

/** The list filters a "Clear filters" removes. */
export const FILTER_KEYS = [
  'q',
  'country',
  'department',
  'level',
  'status',
  'band',
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/**
 * The directory's state lives in the URL (ui.md principle 3). It is read with the same
 * shared schema the API validates with; a hand-edited URL that fails it falls back to the
 * defaults rather than to an error page.
 */
export function readDirectoryQuery(
  search: URLSearchParams,
): EmployeeDirectoryQuery {
  const input: Record<string, string | string[]> = {};
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    input[URL_TO_API[key] ?? key] =
      values.length > 1 ? values : (values[0] ?? '');
  }
  const parsed = EmployeeDirectoryQuerySchema.safeParse(input);
  return parsed.success ? parsed.data : EmployeeDirectoryQuerySchema.parse({});
}

/** The API's query string for one directory state, in the chosen reporting currency. */
export function apiQueryString(
  query: EmployeeDirectoryQuery,
  reportingCurrency: string,
): string {
  const params = new URLSearchParams();
  if (query.q !== undefined) {
    params.set('q', query.q);
  }
  const lists = {
    country: query.country,
    department: query.department,
    level: query.level,
    status: query.status,
    bandPosition: query.bandPosition,
  };
  for (const [key, values] of Object.entries(lists)) {
    for (const value of values) {
      params.append(key, value);
    }
  }
  params.set('sort', sortString(query.sort));
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  params.set('reportingCurrency', reportingCurrency);
  return params.toString();
}

export function sortString(sort: EmployeeDirectoryQuery['sort']): string {
  return sort.map(({ field, direction }) => `${field}:${direction}`).join(',');
}

/** Clicking the sorted column flips it; clicking another sorts by it, ascending. */
export function nextSort(
  current: EmployeeDirectoryQuery['sort'],
  field: EmployeeSortField,
): string {
  const first = current[0];
  const direction =
    first?.field === field && first.direction === 'asc' ? 'desc' : 'asc';
  return `${field}:${direction}`;
}
