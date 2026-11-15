import { Inject, Injectable } from '@nestjs/common';
import {
  type Country,
  type Department,
  JOB_TRACKS,
  type JobFamily,
  type JobLevel,
} from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, type Row, selectRows } from '../db/select-rows.js';

/** The small lookup lists the forms and filters are built from (api.md → Reference data). */
@Injectable()
export class ReferenceRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async countries(): Promise<Country[]> {
    const rows = await selectRows(
      this.db,
      sql`select code, name, currency_code, region from countries order by name`,
    );
    return rows.map((row) => ({
      code: column.text(row, 'code'),
      name: column.text(row, 'name'),
      currencyCode: column.text(row, 'currency_code'),
      region: column.text(row, 'region'),
    }));
  }

  async departments(): Promise<Department[]> {
    const rows = await selectRows(
      this.db,
      sql`select code, name from departments order by name`,
    );
    return rows.map(toCodeAndName);
  }

  async jobFamilies(): Promise<JobFamily[]> {
    const rows = await selectRows(
      this.db,
      sql`select code, name from job_families order by name`,
    );
    return rows.map(toCodeAndName);
  }

  /** The ladder in reading order: the IC track, then the manager track, each by rank. */
  async jobLevels(): Promise<JobLevel[]> {
    const rows = await selectRows(
      this.db,
      sql`select code, track, rank from job_levels order by track, rank, code`,
    );
    return rows.map((row) => ({
      code: column.text(row, 'code'),
      track: column.oneOf(row, 'track', JOB_TRACKS),
      rank: column.number(row, 'rank'),
    }));
  }
}

function toCodeAndName(row: Row): { code: string; name: string } {
  return { code: column.text(row, 'code'), name: column.text(row, 'name') };
}
