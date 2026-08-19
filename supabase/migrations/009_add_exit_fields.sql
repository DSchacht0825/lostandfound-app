-- Add exit tracking fields to persons table
ALTER TABLE public.persons
ADD COLUMN exit_date DATE,
ADD COLUMN exit_destination TEXT,
ADD COLUMN exit_notes TEXT;

-- Add index for exit_date for reporting
CREATE INDEX idx_persons_exit_date ON public.persons(exit_date);
