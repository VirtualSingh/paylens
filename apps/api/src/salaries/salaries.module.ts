import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { SalariesController } from './salaries.controller.js';
import { SalariesService } from './salaries.service.js';
import { SalaryRepository } from './salary.repository.js';

@Module({
  imports: [AuditModule, EmployeesModule],
  controllers: [SalariesController],
  providers: [SalariesService, SalaryRepository],
})
export class SalariesModule {}
