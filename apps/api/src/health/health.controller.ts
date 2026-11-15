import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { Public } from '../auth/access.decorators.js';
import { ApiContract } from '../common/api-contract.js';
import { HealthService } from './health.service.js';

export type ReadinessReport =
  | { readonly status: 'ok'; readonly checks: { readonly database: 'up' } }
  | {
      readonly status: 'unavailable';
      readonly checks: { readonly database: 'down' };
    };

// Only the docs use these; the handlers' return types are the contract in code.
const LivenessSchema = z.object({ status: z.literal('ok') });
const ReadinessSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.object({ database: z.enum(['up', 'down']) }),
});

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is up and serving HTTP. Touches nothing else. */
  @Get()
  @ApiContract({
    summary: 'Liveness: the process answers HTTP',
    public: true,
    success: {
      status: HttpStatus.OK,
      schema: LivenessSchema,
      description: 'Up',
    },
  })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness: the service can do useful work, i.e. its database answers. Not ready → 503,
   * so load balancers and uptime checks stop sending traffic. `passthrough` lets Nest still
   * serialise the returned report while we set the status code.
   */
  @Get('ready')
  @ApiContract({
    summary: 'Readiness: the database answers too',
    public: true,
    success: {
      status: HttpStatus.OK,
      schema: ReadinessSchema,
      description: 'Ready',
    },
    otherResponses: [
      {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        schema: ReadinessSchema,
        description: 'Not ready: the database does not answer',
      },
    ],
  })
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessReport> {
    if (await this.health.isDatabaseReachable()) {
      return { status: 'ok', checks: { database: 'up' } };
    }
    response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: 'unavailable', checks: { database: 'down' } };
  }
}
