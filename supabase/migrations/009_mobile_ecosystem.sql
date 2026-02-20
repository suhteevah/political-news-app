-- ============================================================
-- Migration 009: Mobile Ecosystem
-- Adds device tokens, bookmarks, reports, blocked users,
-- notification preferences, notifications, IAP receipts,
-- and extends subscriptions/comments tables.
-- ============================================================

-- 1. device_tokens — FCM/APNs push notification token registration
CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user
  ON device_tokens (user_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own device tokens' AND tablename='device_tokens') THEN
  CREATE POLICY "Users can read own device tokens"
    ON device_tokens FOR SELECT
    USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can insert own device tokens' AND tablename='device_tokens') THEN
  CREATE POLICY "Users can insert own device tokens"
    ON device_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can delete own device tokens' AND tablename='device_tokens') THEN
  CREATE POLICY "Users can delete own device tokens"
    ON device_tokens FOR DELETE
    USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can update own device tokens' AND tablename='device_tokens') THEN
  CREATE POLICY "Users can update own device tokens"
    ON device_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

-- 2. bookmarks — User saved posts
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user
  ON bookmarks (user_id, created_at DESC);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own bookmarks' AND tablename='bookmarks') THEN
  CREATE POLICY "Users can read own bookmarks"
    ON bookmarks FOR SELECT
    USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can insert own bookmarks' AND tablename='bookmarks') THEN
  CREATE POLICY "Users can insert own bookmarks"
    ON bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can delete own bookmarks' AND tablename='bookmarks') THEN
  CREATE POLICY "Users can delete own bookmarks"
    ON bookmarks FOR DELETE
    USING (auth.uid() = user_id);
END IF;
END $$;

-- 3. reports — Content moderation reports (required by app stores)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'thread')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports (status, created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can insert reports' AND tablename='reports') THEN
  CREATE POLICY "Users can insert reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own reports' AND tablename='reports') THEN
  CREATE POLICY "Users can read own reports"
    ON reports FOR SELECT
    USING (auth.uid() = reporter_id);
END IF;
END $$;

-- Admin reads all reports via service role

-- 4. blocked_users — User-to-user blocks
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker
  ON blocked_users (blocker_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own blocks' AND tablename='blocked_users') THEN
  CREATE POLICY "Users can read own blocks"
    ON blocked_users FOR SELECT
    USING (auth.uid() = blocker_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can insert own blocks' AND tablename='blocked_users') THEN
  CREATE POLICY "Users can insert own blocks"
    ON blocked_users FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can delete own blocks' AND tablename='blocked_users') THEN
  CREATE POLICY "Users can delete own blocks"
    ON blocked_users FOR DELETE
    USING (auth.uid() = blocker_id);
END IF;
END $$;

-- 5. notification_preferences — Per-user push notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  breaking_alerts boolean NOT NULL DEFAULT true,
  wire_posts boolean NOT NULL DEFAULT true,
  comment_replies boolean NOT NULL DEFAULT true,
  new_followers boolean NOT NULL DEFAULT true,
  daily_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own notification preferences' AND tablename='notification_preferences') THEN
  CREATE POLICY "Users can read own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can upsert own notification preferences' AND tablename='notification_preferences') THEN
  CREATE POLICY "Users can upsert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can update own notification preferences' AND tablename='notification_preferences') THEN
  CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

-- 6. notifications — Notification inbox
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own notifications' AND tablename='notifications') THEN
  CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can update own notifications' AND tablename='notifications') THEN
  CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can delete own notifications' AND tablename='notifications') THEN
  CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);
END IF;
END $$;

-- Service role inserts notifications (no user INSERT policy)

-- 7. iap_receipts — Apple/Google purchase receipt validation
CREATE TABLE IF NOT EXISTS iap_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  product_id text NOT NULL,
  transaction_id text NOT NULL UNIQUE,
  receipt_data text NOT NULL,
  validated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iap_receipts_user
  ON iap_receipts (user_id);

CREATE INDEX IF NOT EXISTS idx_iap_receipts_transaction
  ON iap_receipts (transaction_id);

ALTER TABLE iap_receipts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can read own IAP receipts' AND tablename='iap_receipts') THEN
  CREATE POLICY "Users can read own IAP receipts"
    ON iap_receipts FOR SELECT
    USING (auth.uid() = user_id);
END IF;
END $$;

-- Service role handles inserts/updates (receipt validation is server-side only)

-- 8. Extend subscriptions table with source column
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'stripe'
  CHECK (source IN ('stripe', 'iap_apple', 'iap_google'));

-- 9. Extend comments table with edited_at for edit tracking
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 10. Add app_config table for version checks and feature flags
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Public read app config' AND tablename='app_config') THEN
  CREATE POLICY "Public read app config"
    ON app_config FOR SELECT
    USING (true);
END IF;
END $$;

-- Seed default app config
INSERT INTO app_config (key, value) VALUES
  ('ios_min_version', '"1.0.0"'),
  ('ios_current_version', '"1.0.0"'),
  ('android_min_version', '"1.0.0"'),
  ('android_current_version', '"1.0.0"'),
  ('force_update', 'false'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
