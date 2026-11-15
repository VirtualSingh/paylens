import { Injectable } from '@nestjs/common';
import {
  type EmployeeDirectoryPage,
  type EmployeeDirectoryQuery,
  hasAtLeast,
} from '@paylens/shared';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { Clock } from '../common/clock.js';
import { FxRepository } from '../fx/fx.repository.js';
import { toDirectoryItem } from './directory-item.mapper.js';
import { EmployeesRepository } from './employees.repository.js';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employees: EmployeesRepository,
    private readonly fx: FxRepository,
    private readonly clock: Clock,
  ) {}

  /** The people directory; individual pay only for HR managers and admins (api.md → Roles). */
  async directory(
    query: EmployeeDirectoryQuery,
    reader: AuthenticatedUser,
  ): Promise<EmployeeDirectoryPage> {
    const [{ rows, total }, fx] = await Promise.all([
      this.employees.search(query),
      this.fx.loadTable(),
    ]);
    const context = {
      fx,
      reportingCurrency: query.reportingCurrency,
      today: this.clock.today(),
      showPay: hasAtLeast(reader.role, 'hr_manager'),
    };
    return {
      data: rows.map((row) => toDirectoryItem(row, context)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }
}
