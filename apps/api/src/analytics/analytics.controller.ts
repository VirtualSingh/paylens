import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AnalyticsBreakdown,
  type AnalyticsBreakdownQuery,
  AnalyticsBreakdownQuerySchema,
  AnalyticsBreakdownSchema,
  type AnalyticsQuery,
  AnalyticsQuerySchema,
  type AnalyticsSummary,
  AnalyticsSummarySchema,
} from '@paylens/shared';
import { Roles } from '../auth/access.decorators.js';
import { ApiContract } from '../common/api-contract.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AnalyticsService } from './analytics.service.js';

/** "How does ACME pay people?" — aggregates only, so viewers may read them (api.md). */
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @Roles('viewer')
  @ApiContract({
    summary: 'Headcount, annual payroll, median and band positions on a date',
    query: AnalyticsQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: AnalyticsSummarySchema,
      description: 'Converted per person with the rates valid that day',
    },
    problems: [HttpStatus.BAD_REQUEST],
  })
  summary(
    @Query(new ZodValidationPipe(AnalyticsQuerySchema)) query: AnalyticsQuery,
  ): Promise<AnalyticsSummary> {
    return this.analytics.summary(query);
  }

  @Get('breakdown')
  @Roles('viewer')
  @ApiContract({
    summary: 'The summary figures per country, department or level',
    query: AnalyticsBreakdownQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: AnalyticsBreakdownSchema,
      description: 'Largest payroll first; levels in ladder order',
    },
    problems: [HttpStatus.BAD_REQUEST],
  })
  breakdown(
    @Query(new ZodValidationPipe(AnalyticsBreakdownQuerySchema))
    query: AnalyticsBreakdownQuery,
  ): Promise<AnalyticsBreakdown> {
    return this.analytics.breakdown(query);
  }
}
