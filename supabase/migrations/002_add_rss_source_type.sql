-- Migration 002: Add RSS source type and external_url for multi-source content
-- This enables scraping from RSS feeds (podcasts, YouTube, blogs) alongside X/Twitter

-- Expand the source check constraint to include 'rss' and 'youtube'
alter table public.posts drop constraint if exists posts_source_check;
alter table public.posts add constraint posts_source_check
  check (source in ('x', 'user', 'rss', 'youtube'));

-- Add external_url column for linking to original content (podcast episodes, articles, videos)
alter table public.posts add column if not exists external_url text;

-- Add source_id column for deduplication of RSS/YouTube items (guid, video ID, etc.)
alter table public.posts add column if not exists source_id text;

-- Create unique index on source_id for upsert deduplication (like x_tweet_id but for RSS/YT)
create unique index if not exists idx_posts_source_id on public.posts(source_id)
  where source_id is not null;

-- Add index on external_url for lookups
create index if not exists idx_posts_external_url on public.posts(external_url)
  where external_url is not null;
