import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [FxModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
