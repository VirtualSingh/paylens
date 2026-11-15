import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AuditPage,
  AuditPageSchema,
  type AuditQuery,
  AuditQuerySchema,
  EmployeeIdParamsSchema,
  type PaginationQuery,
  PaginationQuerySchema,
} from '@paylens/shared';
import { Roles } from '../auth/access.decorators.js';
import { ApiContract } from '../common/api-contract.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuditService } from './audit.service.js';

/** Reading the audit log; it holds individual pay, so HR managers and up (api.md). */
@ApiTags('Audit')
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('audit')
  @Roles('hr_manager')
  @ApiContract({
    summary: 'The audit log: who changed what, when, before and after',
    query: AuditQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: AuditPageSchema,
      description: 'Newest first',
    },
    problems: [HttpStatus.BAD_REQUEST],
  })
  list(
    @Query(new ZodValidationPipe(AuditQuerySchema)) query: AuditQuery,
  ): Promise<AuditPage> {
    return this.audit.list(query);
  }

  @Get('employees/:id/audit')
  @Roles('hr_manager')
  @ApiContract({
    summary: 'One person’s audit timeline',
    params: EmployeeIdParamsSchema,
    query: PaginationQuerySchema,
    success: {
      status: HttpStatus.OK,
      schema: AuditPageSchema,
      description: 'Newest first',
    },
    problems: [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND],
  })
  forEmployee(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
    @Query(new ZodValidationPipe(PaginationQuerySchema))
    paging: PaginationQuery,
  ): Promise<AuditPage> {
    return this.audit.forEmployee(id, paging);
  }
}
