import { Global, Injectable, Module } from '@nestjs/common';
import type { IsoDate } from '@paylens/domain';

/**
 * "Today", injected wherever a date matters (testing.md → determinism), so tests can fix it
 * instead of depending on when they run.
 */
export abstract class Clock {
  abstract today(): IsoDate;
}

@Injectable()
export class SystemClock extends Clock {
  /** The current UTC date (effective dating is in UTC, CLAUDE.md). */
  today(): IsoDate {
    return new Date().toISOString().slice(0, 10);
  }
}

/** A clock stuck on one date, for tests. */
export class FixedClock extends Clock {
  constructor(private readonly date: IsoDate) {
    super();
  }

  today(): IsoDate {
    return this.date;
  }
}

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
