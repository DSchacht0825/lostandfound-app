# Lost & Found Outreach

A comprehensive by-name list and service tracking system for Lost & Found Outreach, Inc.'s street outreach program in San Diego, CA.

## Features

### Core Functionality
- **By-Name List Management**: Unduplicated client tracking with auto-generated IDs
- **Real-time Duplicate Detection**: Fuzzy matching prevents duplicate entries
- **Service Interaction Tracking**: Record all encounters with required GPS coordinates
- **Client Profiles**: Complete history with demographics, services, and timeline
- **Admin Dashboard**: Comprehensive metrics, heat maps, and data exports

### Service Tracking
- Clinical services (MAT, detox, co-occurring conditions)
- Harm reduction (naloxone, fentanyl test strips, education)
- Case management notes
- Transportation and shower trailer access
- Custom date range reporting

### Technical Features
- **GPS Location Capture**: Auto-detect or manual map selection
- **Interactive Heat Map**: Visualize service locations with Mapbox
- **CSV Export**: Three-file export (summary, clients, interactions)
- **Authentication**: Secure login with Supabase Auth
- **Progressive Web App**: Install to home screen, works offline
- **Mobile-First Design**: Optimized for field workers on phones/tablets

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Maps**: Mapbox GL
- **Forms**: React Hook Form + Zod validation
- **PWA**: next-pwa with service worker
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Mapbox account (free tier is fine)
- Vercel account for deployment

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/DSchacht0825/encinitas-street-reach.git
cd encinitas-street-reach/encinitas-street-reach
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your URL and anon key
3. Run the migration from `supabase/migrations/001_initial_schema.sql` in the SQL Editor
4. Enable Row Level Security on all tables

### 3. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 4. Mapbox Setup

1. Sign up at [mapbox.com](https://www.mapbox.com/)
2. Go to Account > Access Tokens
3. Create a new token or use the default public token
4. Add to `.env.local`

### 5. Create User Accounts

In Supabase Dashboard:
1. Go to Authentication > Users
2. Click "Invite User" or "Add user"
3. Add email/password for each field worker and admin

### 6. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000 and log in with a Supabase user account.

## Deployment to Vercel

### Option 1: GitHub Integration (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New" > "Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
6. Click "Deploy"

### Option 2: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add environment variables when prompted.

## PWA Icons

The app needs icons for mobile installation. See `public/README_ICONS.md` for instructions.

Quick setup with ImageMagick:

```bash
convert -size 512x512 xc:"#1e40af" \
  -gravity center \
  -pointsize 200 \
  -fill white \
  -annotate +0+0 "SR" \
  public/icon-512x512.png

convert public/icon-512x512.png -resize 192x192 public/icon-192x192.png
```

## User Guide

### Field Workers

1. **Log in** with your account
2. **Search** for existing clients or add new ones
3. **Record service interactions**:
   - GPS auto-captures your location
   - If GPS fails, manually select location on map
   - Fill out all services provided
   - Add case notes
4. **View client profiles** to see full history

### Administrators

1. **Access dashboard** from home page
2. **View metrics**:
   - Total clients served
   - Service interaction counts
   - Naloxone distribution
   - Referrals made
3. **Filter by date range** for custom reports
4. **Export data** to CSV for grant reports
5. **View heat map** to identify high-need areas

## Database Schema

### Tables

- **persons**: Client by-name list with demographics
- **encounters**: Service interactions with GPS coordinates
- **users**: (Supabase Auth) Field workers and admins

### Key Fields

**Persons:**
- Auto-generated `client_id` (CL-000001)
- Demographics (age, gender, race, ethnicity)
- Living situation and homeless history
- Veteran and chronic homeless flags

**Encounters:**
- Required GPS coordinates
- Clinical services (MAT, detox, co-occurring)
- Harm reduction (naloxone, test strips)
- Case management notes
- All services timestamped

## Features by Page

### Home Page (/)
- Client search with fuzzy matching
- Add new client button
- Dashboard access
- Logout button

### Client Profile (/client/[id])
- Demographics display
- Service summary (interaction count)
- Complete timeline of all encounters
- New service interaction button

### New Client (/client/new)
- Full intake form
- Real-time duplicate detection
- Auto-generated client ID

### New Interaction (/client/[id]/encounter/new)
- GPS auto-capture with manual fallback
- All service types
- Conditional fields
- Required location validation

### Dashboard (/dashboard)
- 8 key metric cards
- Demographics breakdown
- Service type counts
- Interactive heat map
- Custom date filters
- CSV export (3 files)

### Login (/login)
- Email/password authentication
- Lost & Found Outreach branding
- User role info

## Security

- All routes require authentication
- Row Level Security on all tables
- Secure session management
- Logout clears all cookies
- Environment variables for secrets

## Mobile Installation

1. Open app in mobile browser
2. iOS: Tap Share > Add to Home Screen
3. Android: Tap Menu > Install App
4. App opens full-screen like native app
5. Works offline once cached

## Troubleshooting

**Can't log in:**
- Check Supabase credentials in .env.local
- Verify user exists in Supabase Auth

**GPS not working:**
- Check browser permissions
- Use manual map picker fallback

**Map not loading:**
- Verify Mapbox token in .env.local
- Check browser console for errors

**Deployment fails:**
- Verify all environment variables are set
- Check build logs in Vercel dashboard

## Support

For issues or questions:
1. Check GitHub Issues: https://github.com/DSchacht0825/encinitas-street-reach/issues
2. Contact repository owner
3. Review Supabase and Next.js documentation

## License

Copyright © 2026 Lost & Found Outreach, Inc.

Built with Claude Code

