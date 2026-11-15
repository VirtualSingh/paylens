import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type Country,
  CountrySchema,
  type Department,
  DepartmentSchema,
  type JobFamily,
  JobFamilySchema,
  type JobLevel,
  JobLevelSchema,
} from '@paylens/shared';
import { z } from 'zod';
import { Roles } from '../auth/access.decorators.js';
import {
  ApiContract,
  type ApiContractOptions,
} from '../common/api-contract.js';
import { ReferenceRepository } from './reference.repository.js';

/** Lookups change only when an admin edits them, so browsers may keep them for an hour. */
const ONE_HOUR = 'private, max-age=3600';

/**
 * Lookups for forms and filters (api.md → Reference data). They hold no business rules, so the
 * controller reads the repository directly instead of going through a pass-through service.
 */
@ApiTags('Reference data')
@Controller()
export class ReferenceController {
  constructor(private readonly reference: ReferenceRepository) {}

  @Get('countries')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  @ApiContract(lookup('Countries by name, with their currency', CountrySchema))
  countries(): Promise<Country[]> {
    return this.reference.countries();
  }

  @Get('departments')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  @ApiContract(lookup('Departments by name', DepartmentSchema))
  departments(): Promise<Department[]> {
    return this.reference.departments();
  }

  @Get('job-families')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  @ApiContract(lookup('Job families by name', JobFamilySchema))
  jobFamilies(): Promise<JobFamily[]> {
    return this.reference.jobFamilies();
  }

  @Get('job-levels')
  @Roles('viewer')
  @Header('Cache-Control', ONE_HOUR)
  @ApiContract(
    lookup('Job levels: the IC track, then managers, by rank', JobLevelSchema),
  )
  jobLevels(): Promise<JobLevel[]> {
    return this.reference.jobLevels();
  }
}

/** The contract every lookup shares: the whole list, viewers and up. */
function lookup(summary: string, item: z.ZodType): ApiContractOptions {
  return {
    summary,
    success: {
      status: HttpStatus.OK,
      schema: z.array(item),
      description: 'The whole list; cacheable for an hour',
    },
  };
}
