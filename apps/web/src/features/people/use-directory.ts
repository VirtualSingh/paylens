import {
  type EmployeeDirectoryQuery,
  EmployeeDirectoryPageSchema,
} from '@paylens/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import { useReportingCurrency } from '../../lib/reporting-currency';
import { apiQueryString } from './directory-params';

/**
 * One page of the directory. The previous page stays on screen while the next one loads,
 * so sorting and paging never flash an empty table (ui.md → Loading).
 */
export function useDirectory(query: EmployeeDirectoryQuery) {
  const { currency } = useReportingCurrency();
  const queryString = apiQueryString(query, currency);
  return useQuery({
    queryKey: ['employees', 'directory', queryString],
    queryFn: async () =>
      (
        await apiRequest(
          `/employees?${queryString}`,
          EmployeeDirectoryPageSchema,
        )
      ).data,
    placeholderData: keepPreviousData,
  });
}
