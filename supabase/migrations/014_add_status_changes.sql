-- Migration: Add status_changes table to track exit/return history
-- This allows tracking multiple exits and returns to active for each person

CREATE TABLE IF NOT EXISTS status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('exit', 'return_to_active')),
    change_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_destination TEXT, -- Only populated for 'exit' type
    notes TEXT,
    created_by TEXT, -- Email or name of user who made the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queries by person
CREATE INDEX idx_status_changes_person_id ON status_changes(person_id);

-- Index for date range queries (for reporting)
CREATE INDEX idx_status_changes_date ON status_changes(change_date);

-- Index for filtering by change type
CREATE INDEX idx_status_changes_type ON status_changes(change_type);

-- Composite index for common report queries
CREATE INDEX idx_status_changes_type_date ON status_changes(change_type, change_date);

-- Add trigger for updated_at
CREATE TRIGGER update_status_changes_updated_at
    BEFORE UPDATE ON status_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE status_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tables)
CREATE POLICY "Authenticated users can view all status changes"
    ON status_changes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert status changes"
    ON status_changes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update status changes"
    ON status_changes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE status_changes IS 'Tracks exit and return-to-active status changes for persons';
COMMENT ON COLUMN status_changes.change_type IS 'Either exit or return_to_active';
COMMENT ON COLUMN status_changes.exit_destination IS 'HUD exit destination category, only for exit type';
