-- Remove the restrictive CHECK constraint on addiction field to allow comma-separated values
-- The constraint from 002_add_intake_fields.sql only allowed single values

-- Drop the existing constraint
ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_addiction_check;

-- No new constraint needed - TEXT field can store comma-separated values as documented in 003_multi_select_fields.sql
