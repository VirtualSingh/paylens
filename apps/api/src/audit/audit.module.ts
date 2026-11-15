import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { AuditController } from './audit.controller.js';
import { AuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';

/** Writing audit events (exported, used inside every change) and reading the log. */
@Module({
  imports: [EmployeesModule],
  controllers: [AuditController],
  providers: [AuditRepository, AuditService],
  exports: [AuditRepository],
})
export class AuditModule {}
