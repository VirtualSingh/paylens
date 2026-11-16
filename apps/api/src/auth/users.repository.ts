import { Inject, Injectable } from '@nestjs/common';
import { type CurrentUser, USER_ROLES } from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';

/** The people who use PayLens (not the employees it manages). */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<CurrentUser | null> {
    const rows = await selectRows(
      this.db,
      sql`select id::text, email::text, display_name, role::text, is_demo
          from users where id = ${id}::uuid`,
    );
    const row = rows[0];
    return row === undefined
      ? null
      : {
          id: column.text(row, 'id'),
          email: column.text(row, 'email'),
          displayName: column.text(row, 'display_name'),
          role: column.oneOf(row, 'role', USER_ROLES),
          isDemo: row['is_demo'] === true,
        };
  }
}
