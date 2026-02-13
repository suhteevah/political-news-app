# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard and sign in (create account if needed)
2. Click **New Project**
3. Name: `the-right-wire` (or whatever you prefer)
4. Database Password: generate a strong password and save it
5. Region: pick the closest to you
6. Click **Create new project** — wait ~2 minutes for provisioning

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** — you should see "Success. No rows returned" for each statement

## Step 3: Get Your Credentials

Go to **Settings** > **API** in your Supabase dashboard. Copy these values:

- **Project URL** (looks like `https://xxxxx.supabase.co`)
- **anon / public** key (the short one)
- **service_role** key (the long one — keep this secret!)

## Step 4: Update .env.local

Edit `apps/web/.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
CRON_SECRET=any-random-secret-you-make-up
SEARXNG_URL=
NITTER_INSTANCE_URL=https://xcancel.com
```

## Step 5: Verify

Run the dev server:
```bash
cd "J:/political news app"
npm run dev:web
```

Then visit http://localhost:3000 — you should see the app with no errors.

## Step 6: Add Your First Sources

1. Go to http://localhost:3000/admin
2. Add X handles you want to follow (e.g., `LibHivemind`, `DanBongino`)
3. The cron endpoint will fetch their tweets on the next run

## Step 7: Test the Scraper

Trigger a manual fetch:
```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/fetch-posts
```

You should see a JSON response like `{"message": "Processed 2 sources", "inserted": 5}`.
