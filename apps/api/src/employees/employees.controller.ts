import { Controller, Get, Query } from '@nestjs/common';
import {
  type EmployeeDirectoryPage,
  type EmployeeDirectoryQuery,
  EmployeeDirectoryQuerySchema,
} from '@paylens/shared';
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
}
