-- Extensions the schema relies on (docs/vault/design/data-model.md):
--   btree_gist  exclusion constraints that forbid overlapping effective-dated periods
--   citext      case-insensitive emails
--   pg_trgm     trigram search on names in the directory
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
