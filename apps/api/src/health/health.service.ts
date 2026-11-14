import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';

@Injectable()
export class HealthService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** True when the database answers `select 1`; any failure means "not reachable". */
  async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }
}
