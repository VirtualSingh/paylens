import { Controller, Get, HttpStatus, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type EmployeeDirectoryPage,
  EmployeeDirectoryPageSchema,
  type EmployeeDirectoryQuery,
  EmployeeDirectoryQuerySchema,
  EmployeeIdParamsSchema,
  type EmployeeProfile,
  EmployeeProfileSchema,
} from '@paylens/shared';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../auth/access.decorators.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { ApiContract } from '../common/api-contract.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { EmployeesService } from './employees.service.js';

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  /** The people directory: filters, sort and paging in the query string (api.md). */
  @Get()
  @Roles('viewer')
  @ApiContract({
    summary: 'The people directory: search, filters, sort and paging',
    query: EmployeeDirectoryQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: EmployeeDirectoryPageSchema,
      description: 'One page; individual pay only for HR managers and admins',
    },
    problems: [HttpStatus.BAD_REQUEST],
  })
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
  @ApiContract({
    summary: 'One person: current pay, band metrics and manager',
    params: EmployeeIdParamsSchema,
    success: {
      status: HttpStatus.OK,
      schema: EmployeeProfileSchema,
      description:
        'The profile; pay and gender only for HR managers and admins',
    },
    etag: true,
    problems: [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND],
  })
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
