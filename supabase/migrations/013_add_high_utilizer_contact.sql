-- Add high_utilizer_contact field to encounters table
ALTER TABLE public.encounters
ADD COLUMN high_utilizer_contact BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX idx_encounters_high_utilizer ON public.encounters(high_utilizer_contact);

-- Add comment for documentation
COMMENT ON COLUMN public.encounters.high_utilizer_contact IS 'Indicates if this encounter was with a high utilizer of services';
