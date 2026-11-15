import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  EmployeeIdParamsSchema,
  type SalaryChangeRequest,
  SalaryChangeRequestSchema,
  type SalaryChangeResult,
  SalaryChangeResultSchema,
  SalaryHistorySchema,
  type SalaryRecordJson,
} from '@paylens/shared';
import type { Request } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { ApiContract } from '../common/api-contract.js';
import { expectedVersion } from '../common/if-match.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SalariesService } from './salaries.service.js';

@ApiTags('Salaries')
@Controller('employees/:id')
export class SalariesController {
  constructor(private readonly salaries: SalariesService) {}

  /** Every salary record of one person, newest first (individual pay: HR managers+). */
  @Get('salary-history')
  @Roles('hr_manager')
  @ApiContract({
    summary: 'Every salary record of one person, newest first',
    params: EmployeeIdParamsSchema,
    success: {
      status: HttpStatus.OK,
      schema: SalaryHistorySchema,
      description: 'Records valid on [effectiveFrom, effectiveTo)',
    },
    problems: [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND],
  })
  history(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
  ): Promise<SalaryRecordJson[]> {
    return this.salaries.history(id);
  }

  /**
   * Record a salary change (F-09). Requires If-Match with the profile's ETag: 428 without it,
   * 409 if someone changed the person since. Broken rules (e.g. a date before the current
   * salary) are 422 with the rule's code. Answers 201 with the new record.
   */
  @Post('salary-changes')
  @Roles('hr_manager')
  @ApiContract({
    summary: 'Record a salary change or a correction',
    params: EmployeeIdParamsSchema,
    body: SalaryChangeRequestSchema,
    ifMatch: true,
    success: {
      status: HttpStatus.CREATED,
      schema: SalaryChangeResultSchema,
      description: 'The new record, the pay it gives and the new version',
    },
    problems: [
      HttpStatus.BAD_REQUEST,
      HttpStatus.NOT_FOUND,
      HttpStatus.CONFLICT,
      HttpStatus.UNPROCESSABLE_ENTITY,
      HttpStatus.PRECONDITION_REQUIRED,
    ],
  })
  change(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
    @Body(new ZodValidationPipe(SalaryChangeRequestSchema))
    body: SalaryChangeRequest,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SalaryChangeResult> {
    return this.salaries.change(
      id,
      body,
      expectedVersion(ifMatch),
      actor,
      request.requestId ?? null,
    );
  }
}
