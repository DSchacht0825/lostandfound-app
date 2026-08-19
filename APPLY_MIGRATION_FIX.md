# Fix for Person Creation 400 Error

## Problem
The `addiction` field has a CHECK constraint that only allows single values, but the form sends comma-separated values for multiple addictions.

## Solution
Run the migration `006_fix_addiction_constraint.sql` to remove the restrictive constraint.

## Steps to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your Lost & Found Outreach Supabase project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**
5. Paste this SQL:

```sql
-- Remove the restrictive CHECK constraint on addiction field
ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_addiction_check;
```

6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

### Option 2: Using Supabase CLI (if installed)

```bash
cd ~/lost-and-found-app
supabase db push
```

## Verify the Fix

After applying the migration, try adding a new client through the intake form. It should now work without the 400 error.

## What This Does

- Removes the CHECK constraint that limited the `addiction` field to single values like 'alcohol', 'cocaine', etc.
- Allows the field to store comma-separated values like 'alcohol,meth,fentanyl'
- This aligns with how the form is designed to work (multiple addiction checkboxes)
