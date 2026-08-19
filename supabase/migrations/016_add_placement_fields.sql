-- Add placement fields to encounters table
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS placement_made BOOLEAN DEFAULT FALSE;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS placement_location TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS placement_location_other TEXT;
