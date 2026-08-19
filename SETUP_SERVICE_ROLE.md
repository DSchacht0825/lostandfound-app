# Service Role Key Setup

The user management feature requires a Supabase service role key to create and manage users.

## Local Development Setup

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your Lost & Found Outreach Supabase project
3. Navigate to **Settings** → **API**
4. Find the **service_role key** (labeled as "secret")
5. Copy the service role key
6. Add it to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

## Vercel Production Setup

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your service role key from Supabase
   - Environment: Production (and Preview if needed)
5. Redeploy your application

## Security Notes

⚠️ **IMPORTANT**: The service role key bypasses Row Level Security (RLS) policies and should NEVER be exposed to the client side.

- ✅ **Safe**: Using in Next.js API routes (server-side)
- ❌ **NEVER**: Include in client-side code or commit to git
- ✅ **Already protected**: The `.gitignore` file excludes `.env*` files

The API routes (`/api/admin/users/*`) verify that the requesting user is an admin before performing any operations.
