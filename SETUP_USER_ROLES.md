# Setting Up User Roles

This app uses role-based access control to restrict dashboard access to admin users only.

## Database Setup

1. **Run the migration in Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/004_user_profiles.sql`
   - Click "Run" to execute the migration

## Creating User Profiles

After running the migration, you need to create a profile for each user with their role.

### For Existing Users

Run this SQL for each existing user in your Supabase SQL Editor:

```sql
-- Replace with actual user ID and email from auth.users table
INSERT INTO public.user_profiles (id, email, role, full_name)
VALUES (
  'user-uuid-from-auth-users',  -- Get this from auth.users table
  'user@example.com',
  'admin',  -- or 'field_worker'
  'John Doe'  -- Optional full name
);
```

### To Get User IDs

Run this query to see all authenticated users:

```sql
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;
```

Copy the user IDs and create profiles for each one.

### Quick Setup for All Users

To quickly set up profiles for all existing users as field workers:

```sql
-- Create field_worker profiles for all existing users
INSERT INTO public.user_profiles (id, email, role)
SELECT id, email, 'field_worker'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles);
```

Then manually update specific users to be admins:

```sql
-- Make a specific user an admin
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## For New Users

When you create a new user in Supabase Authentication, you'll also need to create a profile:

1. Go to Authentication > Users in Supabase
2. Add a new user with email/password
3. Copy the user's UUID from the users list
4. Run this SQL:

```sql
INSERT INTO public.user_profiles (id, email, role, full_name)
VALUES (
  'new-user-uuid',
  'newuser@example.com',
  'field_worker',  -- or 'admin'
  'New User Name'
);
```

## User Roles

### Admin (`role = 'admin'`)
Admins can:
- Access the Admin Dashboard
- View all metrics and analytics
- Export data
- Generate custom reports
- Manage duplicates
- Do everything field workers can do

### Field Worker (`role = 'field_worker'`)
Field workers can:
- Search for clients
- Add new clients
- Record service interactions
- View client profiles

Field workers **cannot**:
- Access the admin dashboard
- See the "Admin Dashboard" button on the home page

## Checking User Roles

To see all user profiles and their roles:

```sql
SELECT
  up.email,
  up.role,
  up.full_name,
  up.created_at
FROM public.user_profiles up
ORDER BY up.role, up.email;
```

## Troubleshooting

**Issue:** User can't access the dashboard
- **Solution:** Make sure they have a profile with `role = 'admin'`

**Issue:** Dashboard button not showing for admin
- **Solution:** Check that the user profile exists and role is exactly 'admin' (lowercase)

**Issue:** User gets redirected from dashboard
- **Solution:** Verify the user profile exists in `user_profiles` table and role is 'admin'

## Security Notes

- Row Level Security (RLS) is enabled on the `user_profiles` table
- Users can only read their own profile
- Only admins can read all profiles
- Only admins can create/update/delete profiles
- This prevents field workers from escalating their privileges
