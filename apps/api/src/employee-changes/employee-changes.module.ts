import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { SalariesModule } from '../salaries/salaries.module.js';
import { EmployeeChangesController } from './employee-changes.controller.js';
import { EmployeeChangesService } from './employee-changes.service.js';

/**
 * Writes to a person (create, edit, status). Kept apart from EmployeesModule, which serves
 * reads, because a hire also writes a salary record: this module may depend on both the
 * employees and the salaries modules without the two depending on each other.
 */
@Module({
  imports: [AuditModule, EmployeesModule, SalariesModule],
  controllers: [EmployeeChangesController],
  providers: [EmployeeChangesService],
})
export class EmployeeChangesModule {}
