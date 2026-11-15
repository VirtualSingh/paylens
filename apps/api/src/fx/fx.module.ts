import { Module } from '@nestjs/common';
import { FxRepository } from './fx.repository.js';

@Module({
  providers: [FxRepository],
  exports: [FxRepository],
})
export class FxModule {}
