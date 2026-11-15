import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import {
  type CreateEmployeeRequest,
  CreateEmployeeRequestSchema,
  type EmployeeProfile,
} from '@paylens/shared';
import type { Request, Response } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
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
}
