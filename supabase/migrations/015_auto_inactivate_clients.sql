-- Migration: Add auto-inactivation for clients with no activity for 90 days
-- This creates a function and cron job to automatically mark clients as inactive

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to auto-inactivate clients with no activity for 90 days
CREATE OR REPLACE FUNCTION auto_inactivate_clients()
RETURNS INTEGER AS $$
DECLARE
    inactivated_count INTEGER := 0;
    client_record RECORD;
    last_activity_date DATE;
BEGIN
    -- Loop through all active clients (those without an exit_date)
    FOR client_record IN
        SELECT p.id, p.first_name, p.last_name, p.enrollment_date
        FROM persons p
        WHERE p.exit_date IS NULL
    LOOP
        -- Get the most recent encounter date for this client
        SELECT MAX(DATE(e.service_date)) INTO last_activity_date
        FROM encounters e
        WHERE e.person_id = client_record.id;

        -- If no encounters, use enrollment date
        IF last_activity_date IS NULL THEN
            last_activity_date := client_record.enrollment_date;
        END IF;

        -- Check if last activity was more than 90 days ago
        IF last_activity_date < CURRENT_DATE - INTERVAL '90 days' THEN
            -- Log the status change
            INSERT INTO status_changes (
                person_id,
                change_type,
                change_date,
                exit_destination,
                notes,
                created_by
            ) VALUES (
                client_record.id,
                'exit',
                CURRENT_DATE,
                'Auto-inactivated - No contact for 90 days',
                'Automatically inactivated due to no service interactions for 90+ days. Last activity: ' || last_activity_date::TEXT,
                'System (Auto-inactivation)'
            );

            -- Update the person record
            UPDATE persons
            SET
                exit_date = CURRENT_DATE,
                exit_destination = 'Auto-inactivated - No contact for 90 days',
                exit_notes = 'Automatically inactivated due to no service interactions for 90+ days. Last activity: ' || last_activity_date::TEXT
            WHERE id = client_record.id;

            inactivated_count := inactivated_count + 1;
        END IF;
    END LOOP;

    RETURN inactivated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to run the auto-inactivation daily at 2 AM UTC
-- Note: You may need to adjust the time based on your timezone
SELECT cron.schedule(
    'auto-inactivate-clients',  -- job name
    '0 2 * * *',                -- cron expression: daily at 2 AM UTC
    $$SELECT auto_inactivate_clients()$$
);

-- Grant execute permission to authenticated users (for manual runs if needed)
GRANT EXECUTE ON FUNCTION auto_inactivate_clients() TO authenticated;

-- Comment on function
COMMENT ON FUNCTION auto_inactivate_clients() IS 'Automatically marks clients as inactive if they have had no service interactions for 90+ days. Returns the count of clients inactivated.';
