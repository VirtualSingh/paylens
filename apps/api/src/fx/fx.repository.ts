import { Inject, Injectable } from '@nestjs/common';
import { FxTable } from '@paylens/domain';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';

@Injectable()
export class FxRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * All dated rates as a domain FxTable. The table holds a few rows per currency per year, so
   * loading it whole is cheaper than a query per conversion.
   */
  async loadTable(): Promise<FxTable> {
    const rows = await selectRows(
      this.db,
      sql`select quote_currency, rate::text, as_of::text from fx_rates where base_currency = 'USD'`,
    );
    return new FxTable(
      rows.map((row) => ({
        quote: column.text(row, 'quote_currency'),
        rate: column.text(row, 'rate'),
        asOf: column.text(row, 'as_of'),
      })),
    );
  }
}
