-- Set the database timezone to Pacific Time to prevent date shifting
-- This ensures dates entered in the UI are stored correctly without UTC conversion
ALTER DATABASE postgres SET timezone TO 'America/Los_Angeles';

-- For the current session
SET timezone = 'America/Los_Angeles';
