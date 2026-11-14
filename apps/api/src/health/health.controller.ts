import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /** Liveness: the process is up and serving HTTP. Touches nothing else. */
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
