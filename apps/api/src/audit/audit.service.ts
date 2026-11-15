import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuditPage, AuditQuery, PaginationQuery } from '@paylens/shared';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { AuditRepository } from './audit.repository.js';

@Injectable()
export class AuditService {
  constructor(
    private readonly audit: AuditRepository,
    private readonly employees: EmployeesRepository,
  ) {}

  /** The whole log, filtered (audit screen). */
  async list(query: AuditQuery): Promise<AuditPage> {
    const { page, pageSize, ...filter } = query;
    const { rows, total } = await this.audit.list(filter, { page, pageSize });
    return { data: rows, page, pageSize, total };
  }

  /** One person's timeline (profile → Audit tab); 404 when there is no such person. */
  async forEmployee(id: string, paging: PaginationQuery): Promise<AuditPage> {
    if (!(await this.employees.exists(id))) {
      throw new NotFoundException('There is no employee with this id');
    }
    return this.list({ ...paging, entityType: 'employee', entityId: id });
  }
}
