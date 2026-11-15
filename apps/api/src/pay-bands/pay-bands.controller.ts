import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type PayBand,
  type PayBandsQuery,
  PayBandsQuerySchema,
  PayBandSchema,
} from '@paylens/shared';
import { z } from 'zod';
import { Roles } from '../auth/access.decorators.js';
import { ApiContract } from '../common/api-contract.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PayBandsService } from './pay-bands.service.js';

@ApiTags('Reference data')
@Controller('pay-bands')
export class PayBandsController {
  constructor(private readonly bands: PayBandsService) {}

  /** Bands with head and outlier counts; aggregates, so viewers may read them (api.md). */
  @Get()
  @Roles('viewer')
  @ApiContract({
    summary: 'Pay bands in force on a date, with head and outlier counts',
    query: PayBandsQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: z.array(PayBandSchema),
      description: 'By country, then level',
    },
    problems: [HttpStatus.BAD_REQUEST],
  })
  list(
    @Query(new ZodValidationPipe(PayBandsQuerySchema)) query: PayBandsQuery,
  ): Promise<PayBand[]> {
    return this.bands.list(query);
  }
}
