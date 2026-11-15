-- The API's runtime role (docs/vault/design/security.md → least privilege, ADR-008).
-- It reads and writes rows; it cannot create, alter or drop anything. Migrations run as the
-- owner role (the user running this script), whose future tables are granted automatically.
--
-- Run as the owner, against the direct (non-pooled) connection. Safe to re-run: it creates
-- the role once and (re)sets its password, which is also how the password is rotated.
--   psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -v app_password="$APP_PASSWORD" \
--        -f apps/api/src/db/roles/create-app-role.sql

SELECT 'CREATE ROLE paylens_app LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'paylens_app') \gexec

ALTER ROLE paylens_app WITH LOGIN PASSWORD :'app_password';

-- A slow query is cut off after 5 s, whatever the client or the pooler sends.
ALTER ROLE paylens_app SET statement_timeout = '5s';

GRANT CONNECT ON DATABASE :"DBNAME" TO paylens_app;
GRANT USAGE ON SCHEMA public TO paylens_app;

-- Tables and sequences that already exist …
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO paylens_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO paylens_app;

-- … and those the owner (:USER, who runs the migrations) creates from now on.
ALTER DEFAULT PRIVILEGES FOR ROLE :"USER" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO paylens_app;
ALTER DEFAULT PRIVILEGES FOR ROLE :"USER" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO paylens_app;
