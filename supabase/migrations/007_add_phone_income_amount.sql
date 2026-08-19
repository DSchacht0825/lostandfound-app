-- Add phone_number and income_amount fields to persons table

-- Add phone number field (optional, formatted as text to support various formats)
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add income amount field (numeric for financial tracking)
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS income_amount NUMERIC(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN public.persons.phone_number IS 'Client contact phone number (optional)';
COMMENT ON COLUMN public.persons.income_amount IS 'Monthly income amount in dollars (optional)';
