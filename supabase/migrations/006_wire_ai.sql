-- ============================================================
-- Migration 006: WIRE AI Personality System
-- Adds bot support, wire source type, interaction tracking,
-- column drafts, and runtime configuration.
-- ============================================================

-- 1. Add is_bot flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- 2. Expand posts source constraint to include 'wire'
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_source_check;
ALTER TABLE posts ADD CONSTRAINT posts_source_check
  CHECK (source IN ('x', 'user', 'rss', 'youtube', 'wire'));

-- 3. wire_interactions — Ask WIRE usage tracking + rate limiting
CREATE TABLE IF NOT EXISTS wire_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  response text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('commentator', 'facts')),
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for efficient rate-limit queries (user + date range)
CREATE INDEX IF NOT EXISTS idx_wire_interactions_user_day
  ON wire_interactions (user_id, created_at);

-- RLS: users can read their own interactions
ALTER TABLE wire_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wire interactions"
  ON wire_interactions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT policy for regular users — service role inserts only

-- 4. wire_columns — Weekly column drafts for admin review
CREATE TABLE IF NOT EXISTS wire_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'killed')),
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz
);

ALTER TABLE wire_columns ENABLE ROW LEVEL SECURITY;
-- No public access — admin reads/writes via service role only

-- 5. wire_config — Runtime configuration (avoids redeployment)
CREATE TABLE IF NOT EXISTS wire_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE wire_config ENABLE ROW LEVEL SECURITY;

-- Public read so the client can check if WIRE is enabled
CREATE POLICY "Public read wire config"
  ON wire_config FOR SELECT
  USING (true);

-- Only service role can update (no INSERT/UPDATE/DELETE policies for regular users)

-- 6. Seed default configuration values
INSERT INTO wire_config (key, value) VALUES
  ('enabled', 'true'),
  ('daily_ask_limit_free', '3'),
  ('daily_ask_limit_pro', '10'),
  ('daily_ask_limit_intelligence', '25'),
  ('site_wide_daily_ask_cap', '500'),
  ('max_breaking_comments_per_day', '5'),
  ('max_hot_takes_per_day', '8'),
  ('hot_take_upvote_threshold', '20'),
  ('hot_take_comment_threshold', '15'),
  ('hot_take_window_minutes', '60'),
  ('briefing_enabled', 'true'),
  ('column_enabled', 'true'),
  ('commentator_model', '"claude-3-5-haiku-20241022"'),
  ('facts_model', '"claude-sonnet-4-20250514"')
ON CONFLICT (key) DO NOTHING;
