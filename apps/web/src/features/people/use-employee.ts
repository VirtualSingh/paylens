import {
  AuditPageSchema,
  EmployeeProfileSchema,
  SalaryHistorySchema,
} from '@paylens/shared';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';

export const employeeKeys = {
  all: ['employees'] as const,
  profile: (id: string) => ['employees', id, 'profile'] as const,
  history: (id: string) => ['employees', id, 'salary-history'] as const,
  audit: (id: string) => ['employees', id, 'audit'] as const,
};

/** One profile and its ETag, which every change must send back as If-Match. */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.profile(id),
    queryFn: async () => {
      const { data, etag } = await apiRequest(
        `/employees/${id}`,
        EmployeeProfileSchema,
      );
      return { profile: data, etag: etag ?? `"${data.version}"` };
    },
  });
}

/** Individual pay history; HR managers and up only, so callers pass `enabled`. */
export function useSalaryHistory(id: string, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.history(id),
    queryFn: async () =>
      (await apiRequest(`/employees/${id}/salary-history`, SalaryHistorySchema))
        .data,
    enabled,
  });
}

export function useEmployeeAudit(id: string, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.audit(id),
    queryFn: async () =>
      (await apiRequest(`/employees/${id}/audit`, AuditPageSchema)).data,
    enabled,
  });
}
