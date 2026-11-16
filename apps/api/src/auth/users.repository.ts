import { Inject, Injectable } from '@nestjs/common';
import { type CurrentUser, USER_ROLES, type UserRole } from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, type Row, selectRows } from '../db/select-rows.js';
import type { GoogleIdentity } from './google-token-verifier.js';

const USER_COLUMNS = sql`id::text, email::text, display_name, role::text, is_demo, is_active`;

/** The people who use PayLens (not the employees it manages). */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<CurrentUser | null> {
    const rows = await selectRows(
      this.db,
      sql`select ${USER_COLUMNS} from users where id = ${id}::uuid`,
    );
    const row = rows[0];
    return row === undefined ? null : toUser(row);
  }

  /** The user a Google account signed in as before (by Google id, else by email). */
  async findForGoogle(
    identity: GoogleIdentity,
  ): Promise<(CurrentUser & { isActive: boolean }) | null> {
    const rows = await selectRows(
      this.db,
      sql`select ${USER_COLUMNS} from users
          where google_sub = ${identity.sub} or email = ${identity.email}
          order by (google_sub = ${identity.sub}) desc nulls last
          limit 1`,
    );
    const row = rows[0];
    return row === undefined
      ? null
      : { ...toUser(row), isActive: row['is_active'] === true };
  }

  /** First sign-in: the user row, with the role the allow-lists gave them. */
  async createFromGoogle(
    identity: GoogleIdentity,
    role: UserRole,
  ): Promise<CurrentUser> {
    const rows = await selectRows(
      this.db,
      sql`insert into users (email, display_name, google_sub, role, last_login_at)
          values (${identity.email.toLowerCase()}, ${identity.name}, ${identity.sub},
                  ${role}::user_role, now())
          returning ${USER_COLUMNS}`,
    );
    return toUser(rows[0] ?? {});
  }

  /** Later sign-ins: remember the Google id and when they last came in. */
  async recordSignIn(id: string, identity: GoogleIdentity): Promise<void> {
    await this.db.execute(
      sql`update users set google_sub = ${identity.sub}, last_login_at = now()
          where id = ${id}::uuid`,
    );
  }
}

function toUser(row: Row): CurrentUser {
  return {
    id: column.text(row, 'id'),
    email: column.text(row, 'email'),
    displayName: column.text(row, 'display_name'),
    role: column.oneOf(row, 'role', USER_ROLES),
    isDemo: row['is_demo'] === true,
  };
}
