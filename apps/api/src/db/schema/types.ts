import { customType } from 'drizzle-orm/pg-core';

/**
 * Case-insensitive text (the `citext` extension, enabled by migration 0000). Used for emails,
 * so "Priya.Nair@acme.test" and "priya.nair@ACME.test" are the same address.
 */
export const citext = customType<{ data: string }>({
  dataType: () => 'citext',
});
