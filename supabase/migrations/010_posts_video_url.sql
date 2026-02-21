-- ============================================================
-- Migration 010: Add video_url column to posts
-- Stores direct MP4 video URLs scraped from X/Twitter tweets
-- for inline video playback in-app.
-- ============================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url text;
