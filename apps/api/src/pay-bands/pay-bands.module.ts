import { Module } from '@nestjs/common';
import { PayBandsController } from './pay-bands.controller.js';
import { PayBandsRepository } from './pay-bands.repository.js';
import { PayBandsService } from './pay-bands.service.js';

@Module({
  controllers: [PayBandsController],
  providers: [PayBandsService, PayBandsRepository],
})
export class PayBandsModule {}
