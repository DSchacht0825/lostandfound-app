-- Fix infinite recursion in user_profiles RLS policies
-- "Admins can read all profiles" and "Admins can manage profiles" both check
-- admin status by querying user_profiles from within a policy on user_profiles
-- itself, causing Postgres error 42P17 (infinite recursion) on every read.
--
-- Admin user management already goes through /api/admin/users, which uses
-- the service_role key and bypasses RLS entirely, so these policies aren't
-- needed for the app to function. "Users can read own profile" is untouched
-- and covers the isAdmin()/getUserProfile() self-lookup.

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;
