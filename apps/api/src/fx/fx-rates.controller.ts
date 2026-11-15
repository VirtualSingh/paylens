import { Controller, Get, Query } from '@nestjs/common';
import {
  type FxRate,
  type FxRatesQuery,
  FxRatesQuerySchema,
} from '@paylens/shared';
import { Roles } from '../auth/access.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { FxRepository } from './fx.repository.js';

/** The dated FX rates every conversion uses, so anyone can check a reported figure. */
@Controller('fx-rates')
export class FxRatesController {
  constructor(private readonly fx: FxRepository) {}

  @Get()
  @Roles('viewer')
  list(
    @Query(new ZodValidationPipe(FxRatesQuerySchema)) query: FxRatesQuery,
  ): Promise<FxRate[]> {
    return this.fx.list(query);
  }
}
