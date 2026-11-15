import { Controller, Get, Param } from '@nestjs/common';
import { EmployeeIdParamsSchema, type SalaryRecordJson } from '@paylens/shared';
import { Roles } from '../auth/access.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SalariesService } from './salaries.service.js';

@Controller('employees/:id')
export class SalariesController {
  constructor(private readonly salaries: SalariesService) {}

  /** Every salary record of one person, newest first (individual pay: HR managers+). */
  @Get('salary-history')
  @Roles('hr_manager')
  history(
    @Param(new ZodValidationPipe(EmployeeIdParamsSchema))
    { id }: { id: string },
  ): Promise<SalaryRecordJson[]> {
    return this.salaries.history(id);
  }
}
