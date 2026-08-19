-- Add sexual_orientation field to persons table
-- This field stores the sexual orientation/identity of the client

ALTER TABLE public.persons
ADD COLUMN IF NOT EXISTS sexual_orientation TEXT;

-- Add comment to describe the field
COMMENT ON COLUMN public.persons.sexual_orientation IS 'Sexual orientation/identity of the client';
