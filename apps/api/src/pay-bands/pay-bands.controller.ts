import { Controller, Get, Query } from '@nestjs/common';
import {
  type PayBand,
  type PayBandsQuery,
  PayBandsQuerySchema,
} from '@paylens/shared';
import { Roles } from '../auth/access.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PayBandsService } from './pay-bands.service.js';

@Controller('pay-bands')
export class PayBandsController {
  constructor(private readonly bands: PayBandsService) {}

  /** Bands with head and outlier counts; aggregates, so viewers may read them (api.md). */
  @Get()
  @Roles('viewer')
  list(
    @Query(new ZodValidationPipe(PayBandsQuerySchema)) query: PayBandsQuery,
  ): Promise<PayBand[]> {
    return this.bands.list(query);
  }
}
