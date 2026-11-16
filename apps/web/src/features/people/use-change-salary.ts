import {
  type SalaryChangeRequest,
  SalaryChangeResultSchema,
} from '@paylens/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import { employeeKeys } from './use-employee';

/**
 * Records a salary change, pessimistically (frontend.md → mutations): nothing on screen
 * changes until the server has accepted it. Then every view of people refetches — profile,
 * history, audit and the directory all show the new pay.
 */
export function useChangeSalary(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request,
      etag,
    }: {
      request: SalaryChangeRequest;
      etag: string;
    }) =>
      (
        await apiRequest(
          `/employees/${employeeId}/salary-changes`,
          SalaryChangeResultSchema,
          { method: 'POST', body: request, ifMatch: etag },
        )
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
