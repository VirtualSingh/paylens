import { Module } from '@nestjs/common';
import { FxRatesController } from './fx-rates.controller.js';
import { FxRepository } from './fx.repository.js';

@Module({
  controllers: [FxRatesController],
  providers: [FxRepository],
  exports: [FxRepository],
})
export class FxModule {}
