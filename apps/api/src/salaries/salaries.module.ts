import { Module } from '@nestjs/common';
import { SalariesController } from './salaries.controller.js';
import { SalariesService } from './salaries.service.js';
import { SalaryRepository } from './salary.repository.js';

@Module({
  controllers: [SalariesController],
  providers: [SalariesService, SalaryRepository],
})
export class SalariesModule {}
