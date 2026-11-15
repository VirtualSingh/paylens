import {
  CountrySchema,
  DepartmentSchema,
  JobFamilySchema,
  JobLevelSchema,
} from '@paylens/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from './api-client';

/** Lookups change only when an admin edits them; the API lets browsers keep them an hour. */
const ONE_HOUR = 60 * 60 * 1000;

function useLookup<Item extends z.ZodType>(path: string, item: Item) {
  return useQuery({
    queryKey: ['lookup', path],
    queryFn: async () => (await apiRequest(path, z.array(item))).data,
    staleTime: ONE_HOUR,
  });
}

export const useCountries = () => useLookup('/countries', CountrySchema);
export const useDepartments = () => useLookup('/departments', DepartmentSchema);
export const useJobFamilies = () => useLookup('/job-families', JobFamilySchema);
export const useJobLevels = () => useLookup('/job-levels', JobLevelSchema);

/** USD first (the default), then every country's currency once, alphabetically. */
export function reportingCurrencies(
  countries: readonly { currencyCode: string }[],
): string[] {
  const others = new Set(
    countries
      .map((country) => country.currencyCode)
      .filter((code) => code !== 'USD'),
  );
  return ['USD', ...[...others].sort()];
}
