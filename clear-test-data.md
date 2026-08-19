# Clear Test Data SQL Commands

Run these commands one at a time in Supabase SQL Editor.

## Step 1: Delete Encounters
```sql
DELETE FROM encounters;
```

## Step 2: Delete Status Changes
```sql
DELETE FROM status_changes;
```

## Step 3: Delete Persons
```sql
DELETE FROM persons;
```

## Step 4: Reset Client Number Sequence
```sql
SELECT setval('persons_client_number_seq', 1, false);
```

## Step 5: Verify Everything is Cleared
```sql
SELECT
  (SELECT COUNT(*) FROM persons) as persons_count,
  (SELECT COUNT(*) FROM encounters) as encounters_count,
  (SELECT COUNT(*) FROM status_changes) as status_changes_count;
```

Expected result: All counts should be 0.

## What This Does
- Deletes all test/fake client data
- Resets client ID counter to start from ESR-0001
- Keeps all users, settings, and functionality intact
- Dashboard and reports will work normally (just show zeros until you add real clients)
