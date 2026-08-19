-- Grant base table privileges to the authenticated role.
-- RLS policies only restrict access on top of privileges that already exist;
-- without an explicit GRANT, Postgres denies access before RLS is even
-- evaluated (error 42501 "permission denied for table persons"). This
-- project's tables were missing these grants entirely.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.persons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.encounters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.status_changes TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.users TO authenticated;

-- Inserting a person calls nextval() on this sequence to generate client_id
GRANT USAGE, SELECT ON SEQUENCE public.person_id_seq TO authenticated;

-- Cover any future tables created the same way, so this doesn't recur
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
