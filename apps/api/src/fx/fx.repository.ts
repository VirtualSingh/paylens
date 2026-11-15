import { Inject, Injectable } from '@nestjs/common';
import { FxTable } from '@paylens/domain';
import type { FxRate, FxRatesQuery } from '@paylens/shared';
import { type SQL, sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';

const USD_ONLY = ['USD'] as const;

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

  /**
   * The rates table, newest first. `trim_scale` drops the zeros numeric(18,8) pads with, so
   * 83 reads "83", not "83.00000000"; the value is unchanged.
   */
  async list(query: FxRatesQuery): Promise<FxRate[]> {
    const conditions: SQL[] = [];
    if (query.quote !== undefined) {
      conditions.push(sql`quote_currency = ${query.quote}`);
    }
    if (query.from !== undefined) {
      conditions.push(sql`as_of >= ${query.from}`);
    }
    if (query.to !== undefined) {
      conditions.push(sql`as_of <= ${query.to}`);
    }
    const where =
      conditions.length === 0
        ? sql``
        : sql`where ${sql.join(conditions, sql` and `)}`;

    const rows = await selectRows(
      this.db,
      sql`select base_currency, quote_currency, trim_scale(rate)::text as rate,
                 as_of::text, source
          from fx_rates
          ${where}
          order by as_of desc, quote_currency`,
    );
    return rows.map((row) => ({
      baseCurrency: column.oneOf(row, 'base_currency', USD_ONLY),
      quoteCurrency: column.text(row, 'quote_currency'),
      rate: column.text(row, 'rate'),
      asOf: column.text(row, 'as_of'),
      source: column.text(row, 'source'),
    }));
  }
}
