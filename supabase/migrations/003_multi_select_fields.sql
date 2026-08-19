-- Update disability_type and addiction fields to support multiple values
-- These will store comma-separated values (e.g., "Physical,Mental Health,Substance Use")

-- No schema changes needed - TEXT fields can store comma-separated values
-- This migration documents the change in how we use these fields

-- Add comment to document the multi-value format
COMMENT ON COLUMN public.persons.disability_type IS 'Comma-separated list of disability types: Physical, Mental Health, Substance Use, Developmental, Chronic Health Condition, Multiple, Other';
COMMENT ON COLUMN public.persons.addiction IS 'Comma-separated list of substances: alcohol, cocaine, opioids, meth, fentanyl, inhalants, other';
