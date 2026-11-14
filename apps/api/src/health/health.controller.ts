import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

export type ReadinessReport =
  | { readonly status: 'ok'; readonly checks: { readonly database: 'up' } }
  | {
      readonly status: 'unavailable';
      readonly checks: { readonly database: 'down' };
    };

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is up and serving HTTP. Touches nothing else. */
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness: the service can do useful work, i.e. its database answers. Not ready → 503,
   * so load balancers and uptime checks stop sending traffic. `passthrough` lets Nest still
   * serialise the returned report while we set the status code.
   */
  @Get('ready')
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
