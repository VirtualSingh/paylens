import {
  type CreateEmployeeRequest,
  EmployeeProfileSchema,
  type EmployeeStatusChangeRequest,
  type UpdateEmployeeRequest,
} from '@paylens/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import { employeeKeys } from './use-employee';

/** After any change to a person, every view of people refetches (frontend.md → mutations). */
function useRefreshPeople() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: employeeKeys.all });
}

export function useCreateEmployee() {
  const refresh = useRefreshPeople();
  return useMutation({
    mutationFn: async (request: CreateEmployeeRequest) =>
      (
        await apiRequest('/employees', EmployeeProfileSchema, {
          method: 'POST',
          body: request,
        })
      ).data,
    onSuccess: refresh,
  });
}

export function useUpdateEmployee(id: string) {
  const refresh = useRefreshPeople();
  return useMutation({
    mutationFn: async ({
      request,
      etag,
    }: {
      request: UpdateEmployeeRequest;
      etag: string;
    }) =>
      (
        await apiRequest(`/employees/${id}`, EmployeeProfileSchema, {
          method: 'PATCH',
          body: request,
          ifMatch: etag,
        })
      ).data,
    onSuccess: refresh,
  });
}

export function useChangeStatus(id: string) {
  const refresh = useRefreshPeople();
  return useMutation({
    mutationFn: async ({
      request,
      etag,
    }: {
      request: EmployeeStatusChangeRequest;
      etag: string;
    }) =>
      (
        await apiRequest(`/employees/${id}/status`, EmployeeProfileSchema, {
          method: 'POST',
          body: request,
          ifMatch: etag,
        })
      ).data,
    onSuccess: refresh,
  });
}
