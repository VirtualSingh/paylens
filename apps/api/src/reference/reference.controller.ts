import { Controller, Get, Header } from '@nestjs/common';
import type { Country, Department, JobFamily, JobLevel } from '@paylens/shared';
import { Roles } from '../auth/access.decorators.js';
import { ReferenceRepository } from './reference.repository.js';

/** Lookups change only when an admin edits them, so browsers may keep them for an hour. */
const ONE_HOUR = 'private, max-age=3600';

/**
 * Lookups for forms and filters (api.md → Reference data). They hold no business rules, so the
 * controller reads the repository directly instead of going through a pass-through service.
 */
@Controller()
export class ReferenceController {
  constructor(private readonly reference: ReferenceRepository) {}

  @Get('countries')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  countries(): Promise<Country[]> {
    return this.reference.countries();
  }

  @Get('departments')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  departments(): Promise<Department[]> {
    return this.reference.departments();
  }

  @Get('job-families')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  jobFamilies(): Promise<JobFamily[]> {
    return this.reference.jobFamilies();
  }

  @Get('job-levels')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  jobLevels(): Promise<JobLevel[]> {
    return this.reference.jobLevels();
  }
}
