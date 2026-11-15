import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type EmployeeDirectoryPage,
  type EmployeeDirectoryQuery,
  type EmployeeProfile,
  hasAtLeast,
} from '@paylens/shared';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { Clock } from '../common/clock.js';
import { FxRepository } from '../fx/fx.repository.js';
import {
  type DirectoryContext,
  toDirectoryItem,
  toProfile,
} from './directory-item.mapper.js';
import { EmployeesRepository } from './employees.repository.js';

/** Reporting currency for single-employee reads until settings are wired (data-model.md). */
const DEFAULT_REPORTING_CURRENCY = 'USD';

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
    const [{ rows, total }, context] = await Promise.all([
      this.employees.search(query),
      this.contextFor(reader, query.reportingCurrency),
    ]);
    return {
      data: rows.map((row) => toDirectoryItem(row, context)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /** One person's profile; 404 when there is nobody with this id. */
  async profile(
    id: string,
    reader: AuthenticatedUser,
  ): Promise<EmployeeProfile> {
    const [row, context] = await Promise.all([
      this.employees.findById(id),
      this.contextFor(reader, DEFAULT_REPORTING_CURRENCY),
    ]);
    if (row === null) {
      throw new NotFoundException('There is no employee with this id');
    }
    return toProfile(row, context);
  }

  private async contextFor(
    reader: AuthenticatedUser,
    reportingCurrency: string,
  ): Promise<DirectoryContext> {
    return {
      fx: await this.fx.loadTable(),
      reportingCurrency,
      today: this.clock.today(),
      showPay: hasAtLeast(reader.role, 'hr_manager'),
    };
  }
}
