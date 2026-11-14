import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';

@Injectable()
export class HealthService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async isDatabaseReachable(): Promise<boolean> {
    await this.db.execute(sql`select 1`);
    return true;
  }
}
