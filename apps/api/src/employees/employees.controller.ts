import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  type EmployeeDirectoryPage,
  type EmployeeDirectoryQuery,
  EmployeeDirectoryQuerySchema,
  EmployeeIdParamsSchema,
  type EmployeeProfile,
} from '@paylens/shared';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { EmployeesService } from './employees.service.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  /** The people directory: filters, sort and paging in the query string (api.md). */
  @Get()
  @Roles('viewer')
  list(
    @Query(new ZodValidationPipe(EmployeeDirectoryQuerySchema))
    query: EmployeeDirectoryQuery,
    @CurrentUser() reader: AuthenticatedUser,
  ): Promise<EmployeeDirectoryPage> {
    return this.employees.directory(query, reader);
  }

  /**
   * One person's profile. The ETag is the record's version: changes must send it back as
   * If-Match, so nobody overwrites an edit they have not seen (api.md → Concurrency).
   */
  @Get(':id')
  @Roles('viewer')
  async profile(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
    @CurrentUser() reader: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmployeeProfile> {
    const profile = await this.employees.profile(id, reader);
    response.setHeader('ETag', `"${profile.version}"`);
    return profile;
  }
}
