import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type FxRate,
  type FxRatesQuery,
  FxRatesQuerySchema,
  FxRateSchema,
} from '@paylens/shared';
import { z } from 'zod';
import { Roles } from '../auth/access.decorators.js';
import { ApiContract } from '../common/api-contract.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { FxRepository } from './fx.repository.js';

/** The dated FX rates every conversion uses, so anyone can check a reported figure. */
@ApiTags('Reference data')
@Controller('fx-rates')
export class FxRatesController {
  constructor(private readonly fx: FxRepository) {}

  @Get()
  @Roles('viewer')
  @ApiContract({
    summary: 'The dated USD-based rates every conversion uses',
    query: FxRatesQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: z.array(FxRateSchema),
      description: 'Newest first',
    },
    problems: [HttpStatus.BAD_REQUEST],
  })
  list(
    @Query(new ZodValidationPipe(FxRatesQuerySchema)) query: FxRatesQuery,
  ): Promise<FxRate[]> {
    return this.fx.list(query);
  }
}
