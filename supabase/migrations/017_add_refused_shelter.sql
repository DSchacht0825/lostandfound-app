-- Add refused_shelter field to encounters table
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS refused_shelter BOOLEAN DEFAULT FALSE;
