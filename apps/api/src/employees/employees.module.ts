import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module.js';
import { EmployeesController } from './employees.controller.js';
import { EmployeesRepository } from './employees.repository.js';
import { EmployeesService } from './employees.service.js';

@Module({
  imports: [FxModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
