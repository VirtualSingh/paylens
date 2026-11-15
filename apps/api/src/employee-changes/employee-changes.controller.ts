import {
  Body,
  Controller,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  type CreateEmployeeRequest,
  CreateEmployeeRequestSchema,
  EmployeeIdParamsSchema,
  type EmployeeProfile,
  type UpdateEmployeeRequest,
  UpdateEmployeeRequestSchema,
} from '@paylens/shared';
import type { Request, Response } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { expectedVersion } from '../common/if-match.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { API_PREFIX } from '../configure-app.js';
import { EmployeeChangesService } from './employee-changes.service.js';

@Controller('employees')
export class EmployeeChangesController {
  constructor(private readonly changes: EmployeeChangesService) {}

  /**
   * Add a person with their hire salary (F-10). Answers 201 with the profile, its address in
   * Location and its version in ETag, ready for the next change.
   */
  @Post()
  @Roles('hr_manager')
  async create(
    @Body(new ZodValidationPipe(CreateEmployeeRequestSchema))
    body: CreateEmployeeRequest,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmployeeProfile> {
    const profile = await this.changes.create(
      body,
      actor,
      request.requestId ?? null,
    );
    response.setHeader('Location', `/${API_PREFIX}/employees/${profile.id}`);
    response.setHeader('ETag', `"${profile.version}"`);
    return profile;
  }

  /**
   * Edit employment details (F-10). Requires If-Match with the profile's ETag: 428 without it,
   * 409 when someone changed the person since. Answers with the profile and its new ETag.
   */
  @Patch(':id')
  @Roles('hr_manager')
  async update(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
    @Body(new ZodValidationPipe(UpdateEmployeeRequestSchema))
    body: UpdateEmployeeRequest,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmployeeProfile> {
    const profile = await this.changes.update(
      id,
      body,
      expectedVersion(ifMatch),
      actor,
      request.requestId ?? null,
    );
    response.setHeader('ETag', `"${profile.version}"`);
    return profile;
  }
}
