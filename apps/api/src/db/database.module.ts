import { Global, Module } from '@nestjs/common';
import { createDatabase, DATABASE } from './database.js';

/** Provides the one Database for the whole app; tests override DATABASE with PGlite. */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => createDatabase(process.env.DATABASE_URL),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
