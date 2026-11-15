import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
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
  EmployeeProfileSchema,
  type EmployeeStatusChangeRequest,
  EmployeeStatusChangeRequestSchema,
  type UpdateEmployeeRequest,
  UpdateEmployeeRequestSchema,
} from '@paylens/shared';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { ApiContract } from '../common/api-contract.js';
import { expectedVersion } from '../common/if-match.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { API_PREFIX } from '../configure-app.js';
import { EmployeeChangesService } from './employee-changes.service.js';

@ApiTags('Employees')
@Controller('employees')
export class EmployeeChangesController {
  constructor(private readonly changes: EmployeeChangesService) {}

  /**
   * Add a person with their hire salary (F-10). Answers 201 with the profile, its address in
   * Location and its version in ETag, ready for the next change.
   */
  @Post()
  @Roles('hr_manager')
  @ApiContract({
    summary: 'Add a person with the salary they are hired on',
    body: CreateEmployeeRequestSchema,
    success: {
      status: HttpStatus.CREATED,
      schema: EmployeeProfileSchema,
      description: 'The new profile; Location is its address',
    },
    etag: true,
    problems: [
      HttpStatus.BAD_REQUEST,
      HttpStatus.CONFLICT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    ],
  })
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
  @ApiContract({
    summary: 'Edit employment details',
    params: EmployeeIdParamsSchema,
    body: UpdateEmployeeRequestSchema,
    ifMatch: true,
    success: {
      status: HttpStatus.OK,
      schema: EmployeeProfileSchema,
      description: 'The profile after the edit',
    },
    etag: true,
    problems: [
      HttpStatus.BAD_REQUEST,
      HttpStatus.NOT_FOUND,
      HttpStatus.CONFLICT,
      HttpStatus.UNPROCESSABLE_ENTITY,
      HttpStatus.PRECONDITION_REQUIRED,
    ],
  })
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

  /**
   * Leave, return or termination (F-11), with If-Match like every change to a person. An
   * action on an existing person, so 200 with the profile and its new ETag, not 201.
   */
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @Roles('hr_manager')
  @ApiContract({
    summary: 'Leave, return or termination',
    params: EmployeeIdParamsSchema,
    body: EmployeeStatusChangeRequestSchema,
    ifMatch: true,
    success: {
      status: HttpStatus.OK,
      schema: EmployeeProfileSchema,
      description: 'The profile with its new status',
    },
    etag: true,
    problems: [
      HttpStatus.BAD_REQUEST,
      HttpStatus.NOT_FOUND,
      HttpStatus.CONFLICT,
      HttpStatus.UNPROCESSABLE_ENTITY,
      HttpStatus.PRECONDITION_REQUIRED,
    ],
  })
  async changeStatus(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
    @Body(new ZodValidationPipe(EmployeeStatusChangeRequestSchema))
    body: EmployeeStatusChangeRequest,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmployeeProfile> {
    const profile = await this.changes.changeStatus(
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
