-- Make date_of_birth nullable since it's now optional in the intake form
ALTER TABLE public.persons
ALTER COLUMN date_of_birth DROP NOT NULL;

-- Also make ethnicity nullable since we combined it with race
ALTER TABLE public.persons
ALTER COLUMN ethnicity DROP NOT NULL;
