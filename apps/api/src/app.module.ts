import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ClockModule } from './common/clock.js';
import { DatabaseModule } from './db/database.module.js';
import { EmployeeChangesModule } from './employee-changes/employee-changes.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { FxModule } from './fx/fx.module.js';
import { HealthModule } from './health/health.module.js';
import { PayBandsModule } from './pay-bands/pay-bands.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { SalariesModule } from './salaries/salaries.module.js';

@Module({
  imports: [
    DatabaseModule,
    ClockModule,
    AuthModule,
    HealthModule,
    EmployeesModule,
    EmployeeChangesModule,
    SalariesModule,
    ReferenceModule,
    PayBandsModule,
    FxModule,
  ],
})
export class AppModule {}
