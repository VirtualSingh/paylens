import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

export interface ReadinessReport {
  readonly status: 'ok';
  readonly checks: { readonly database: 'up' };
}

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is up and serving HTTP. Touches nothing else. */
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: the service can do useful work, i.e. its database answers. */
  @Get('ready')
  async ready(): Promise<ReadinessReport> {
    await this.health.isDatabaseReachable();
    return { status: 'ok', checks: { database: 'up' } };
  }
}
