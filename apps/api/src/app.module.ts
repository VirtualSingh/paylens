import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ClockModule } from './common/clock.js';
import { DatabaseModule } from './db/database.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { HealthModule } from './health/health.module.js';
import { SalariesModule } from './salaries/salaries.module.js';

@Module({
  imports: [
    DatabaseModule,
    ClockModule,
    AuthModule,
    HealthModule,
    EmployeesModule,
    SalariesModule,
  ],
})
export class AppModule {}
