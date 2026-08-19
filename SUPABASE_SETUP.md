# Supabase Setup Guide for Lost & Found Outreach

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a free account
3. Click "New Project"
4. Fill in the project details:
   - **Project Name**: `encinitas-street-reach`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to you (e.g., `West US (North California)`)
   - **Pricing Plan**: Free tier is fine for development
5. Click "Create new project" and wait 2-3 minutes for it to initialize

## Step 2: Get Your API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. Keep this page open - you'll need these values in Step 4

## Step 3: Run the Database Migration

1. In your Supabase project, click on **SQL Editor** in the left sidebar
2. Click **New query** button
3. Open the migration file from this project:
   - File location: `supabase/migrations/001_initial_schema.sql`
4. Copy the entire contents of that file
5. Paste it into the SQL Editor in Supabase
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" - this is good!

### What this migration does:
- Creates the `persons` table (by-name list)
- Creates the `encounters` table (service interactions)
- Creates the `users` table (staff accounts)
- Sets up indexes for fast searching
- Enables fuzzy text search with pg_trgm
- Creates the duplicate detection function
- Configures Row Level Security policies

## Step 4: Configure Environment Variables

1. In your project folder, copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and fill in your values:
   ```env
   # From Step 2
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Get this from Mapbox (see Step 6)
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
   ```

## Step 5: Enable Email Authentication

1. In Supabase, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Under **Email Auth** settings:
   - ✅ Enable email confirmations (for production)
   - For development, you can disable confirmations to test faster
4. Scroll down to **Auth Providers** section
5. You can add additional providers later (Google, etc.) if needed

## Step 6: Get a Mapbox Token (for Maps)

1. Go to [https://www.mapbox.com](https://www.mapbox.com)
2. Sign up for a free account
3. Go to your **Account** page
4. Under **Access tokens**, copy your **Default public token**
5. Paste it in `.env.local` as `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

**Note**: Mapbox free tier includes:
- 50,000 map loads per month
- 100,000 geocoding requests per month
- More than enough for this project

## Step 7: Create Your First User

### Option A: Create via Supabase Dashboard (Recommended for first admin)

1. In Supabase, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email**: your email address
   - **Password**: create a password
   - **Auto Confirm User**: ✅ Check this for development
4. Click **Create user**
5. Copy the user's UUID (you'll need it for next step)

### Option B: Create via SQL (to also set role)

1. Go to **SQL Editor** in Supabase
2. Run this query (replace with your email):

```sql
-- First, create the auth user
-- (Do this through the UI first, then get the UUID)

-- Then, add them to the users table with admin role
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'paste-user-uuid-here',
  'your-email@example.com',
  'Your Name',
  'admin'
);
```

## Step 8: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. If everything is configured correctly, the app should load without errors

## Step 9: Verify Database Tables

1. In Supabase, go to **Table Editor**
2. You should see three tables:
   - `persons` - for client records
   - `encounters` - for service interactions
   - `users` - for staff accounts

3. Click on each table to verify the columns match the schema

## Common Issues & Troubleshooting

### Issue: "relation does not exist" error
**Solution**: The migration didn't run. Go back to Step 3 and run the SQL migration.

### Issue: "JWT expired" or authentication errors
**Solution**:
- Check that your API keys are correct in `.env.local`
- Make sure you copied the **anon** key, not the **service_role** key
- Restart your dev server after changing `.env.local`

### Issue: "permission denied for table"
**Solution**: Row Level Security is blocking you. Make sure:
- You're logged in with a valid user
- The user exists in both `auth.users` AND `public.users` tables
- RLS policies are correctly set (they should be from the migration)

### Issue: Duplicate detection not working
**Solution**:
- Make sure the pg_trgm extension is enabled
- Check that the `search_similar_persons` function exists
- Run: `SELECT * FROM pg_extension WHERE extname = 'pg_trgm';`

## Next Steps

Once Supabase is set up:

1. ✅ Test user authentication
2. ✅ Create a test client record
3. ✅ Add a test service interaction
4. ✅ Verify GPS coordinates are captured
5. ✅ Test the duplicate detection
6. ✅ Test the search functionality

## Security Notes

### For Production:

1. **Enable RLS on all tables** ✅ (already done in migration)
2. **Use environment variables** ✅ (already configured)
3. **Enable email confirmation** (currently disabled for dev)
4. **Set up proper CORS** (handled by Supabase automatically)
5. **Never commit `.env.local`** ✅ (already in .gitignore)
6. **Use service_role key only on server** ✅ (we only use anon key)

### Database Backups:

- Supabase Pro includes daily backups
- Free tier: manually export your data periodically
- Go to **Database** → **Backups** to manage

## Support

If you run into issues:
1. Check the [Supabase docs](https://supabase.com/docs)
2. Check your browser console for errors
3. Check the server logs in your terminal
4. Review the SQL migration file for any syntax errors
