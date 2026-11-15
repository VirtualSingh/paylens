import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  EmployeeIdParamsSchema,
  type SalaryChangeRequest,
  SalaryChangeRequestSchema,
  type SalaryChangeResult,
  type SalaryRecordJson,
} from '@paylens/shared';
import type { Request } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { expectedVersion } from '../common/if-match.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SalariesService } from './salaries.service.js';

@Controller('employees/:id')
export class SalariesController {
  constructor(private readonly salaries: SalariesService) {}

  /** Every salary record of one person, newest first (individual pay: HR managers+). */
  @Get('salary-history')
  @Roles('hr_manager')
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
