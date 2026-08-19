-- Same class of bug as 019, but for service_role this time: the
-- /api/admin/users routes use the service_role client (which is supposed to
-- bypass RLS) to read/write user_profiles, but this project never had the
-- usual default privilege grants set up for service_role either, so
-- Postgres denies access at the table-privilege layer (42501) before RLS
-- is even relevant.
--
-- Granting broadly here (all current tables + future ones) since
-- service_role is meant to have full access by design.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
