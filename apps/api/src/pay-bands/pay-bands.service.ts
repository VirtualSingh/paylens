import { Injectable } from '@nestjs/common';
import type { PayBand, PayBandsQuery } from '@paylens/shared';
import { Clock } from '../common/clock.js';
import { PayBandsRepository } from './pay-bands.repository.js';

@Injectable()
export class PayBandsService {
  constructor(
    private readonly bands: PayBandsRepository,
    private readonly clock: Clock,
  ) {}

  /** Bands in force on the requested date, today when none is given. */
  async list(query: PayBandsQuery): Promise<PayBand[]> {
    const rows = await this.bands.list({
      asOf: query.asOf ?? this.clock.today(),
      country: query.country,
      level: query.level,
    });
    return rows.map((row) => {
      const money = (amountMinor: bigint) => ({
        amountMinor: amountMinor.toString(),
        currency: row.currency,
      });
      return {
        id: row.id,
        countryCode: row.countryCode,
        levelCode: row.levelCode,
        min: money(row.minMinor),
        mid: money(row.midMinor),
        max: money(row.maxMinor),
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        employeeCount: row.employeeCount,
        belowCount: row.belowCount,
        aboveCount: row.aboveCount,
      };
    });
  }
}
