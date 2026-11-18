import {
  AnalyticsBreakdownSchema,
  AnalyticsSummarySchema,
  BandPositioningSchema,
  type BreakdownDimension,
  PayGapSchema,
} from '@paylens/shared';
import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import { apiRequest } from '../../lib/api-client';
import { useReportingCurrency } from '../../lib/reporting-currency';

/** One analytics question in the app-wide reporting currency (ui.md → Currency). */
function useAnalytics<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  params: Record<string, string> = {},
  enabled = true,
) {
  const { currency } = useReportingCurrency();
  const query = new URLSearchParams({ ...params, reportingCurrency: currency });
  return useQuery({
    queryKey: ['analytics', path, query.toString()],
    queryFn: async () =>
      (await apiRequest(`/analytics/${path}?${query}`, schema)).data,
    enabled,
  });
}

export const useSummary = () => useAnalytics('summary', AnalyticsSummarySchema);
export const useBreakdown = (by: BreakdownDimension) =>
  useAnalytics('breakdown', AnalyticsBreakdownSchema, { by });
export const useBandPositioning = () =>
  useAnalytics('band-positioning', BandPositioningSchema);
/** HR managers and admins only (gender is HR data): callers pass `enabled`. */
export const usePayGap = (enabled: boolean) =>
  useAnalytics('pay-gap', PayGapSchema, {}, enabled);
