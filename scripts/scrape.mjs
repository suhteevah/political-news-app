#!/usr/bin/env node
/**
 * Standalone Twitter/X scraper script (backup/testing).
 * Uses Twitter's syndication API — no auth required, works from any IP.
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/scrape.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────────

const SYNDICATION_BASE =
  "https://syndication.twitter.com/srv/timeline-profile/screen-name";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const DELAY_BETWEEN_SOURCES_MS = 2000;
const MAX_TWEETS_PER_SOURCE = 10;

// ── Supabase ────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Syndication fetcher ─────────────────────────────────────────

async function fetchSyndicationTimeline(handle) {
  const url = `${SYNDICATION_BASE}/${handle}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://the-right-wire.com/",
      Origin: "https://the-right-wire.com",
    },
  });

  if (!response.ok) {
    throw new Error(`Syndication fetch failed for @${handle}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match || !match[1]) {
    throw new Error(`No __NEXT_DATA__ found in syndication response for @${handle}`);
  }

  const data = JSON.parse(match[1]);
  const entries = data?.props?.pageProps?.timeline?.entries ?? [];

  return entries
    .filter((e) => e.type === "tweet" && e.content?.tweet)
    .map((e) => e.content.tweet);
}

// ── Tweet normalization ─────────────────────────────────────────

function normalizeTweet(tweet) {
  const id = tweet.id_str;
  const text = tweet.full_text;
  if (!id || !text) return null;

  // Skip retweets
  if (tweet.retweeted_status) return null;
  if (text.startsWith("RT @")) return null;

  const mediaUrls = [];
  let videoUrl = null;

  const mediaList = tweet.extended_entities?.media ?? tweet.entities?.media ?? [];

  for (const media of mediaList) {
    if (media.type === "photo" && media.media_url_https) {
      mediaUrls.push(media.media_url_https);
    } else if (
      (media.type === "video" || media.type === "animated_gif") &&
      media.video_info?.variants
    ) {
      const mp4Variants = media.video_info.variants
        .filter((v) => v.content_type === "video/mp4" && v.url)
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

      if (mp4Variants.length > 0) {
        videoUrl = mp4Variants[0].url;
      }
      if (media.media_url_https) {
        mediaUrls.push(media.media_url_https);
      }
    }
  }

  // Clean content: remove trailing t.co links
  const cleanContent = text.replace(/\s*https:\/\/t\.co\/\w+$/g, "").trim();

  let createdAt;
  try {
    createdAt = tweet.created_at
      ? new Date(tweet.created_at).toISOString()
      : new Date().toISOString();
  } catch {
    createdAt = new Date().toISOString();
  }

  let avatarUrl = null;
  if (tweet.user?.profile_image_url_https) {
    avatarUrl = tweet.user.profile_image_url_https.replace("_normal", "_400x400");
  }

  return {
    tweetId: id,
    authorHandle: tweet.user?.screen_name ?? "",
    authorName: tweet.user?.name ?? tweet.user?.screen_name ?? "",
    authorAvatar: avatarUrl,
    content: cleanContent,
    mediaUrls,
    videoUrl,
    createdAt,
  };
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("[scraper] Starting X/Twitter scrape via syndication API...");

  // Get all active curated sources, filter to X-type
  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .eq("is_active", true);

  const xSources = (sources || []).filter(
    (s) => !s.source_type || s.source_type === "x"
  );

  if (xSources.length === 0) {
    console.log("[scraper] No active X sources found");
    process.exit(0);
  }

  console.log(`[scraper] Fetching from ${xSources.length} X sources...`);

  let totalUpserted = 0;
  const errors = [];
  const sourceStats = [];

  for (const source of xSources) {
    try {
      const rawTweets = await fetchSyndicationTimeline(source.x_handle);
      const tweets = [];
      for (const raw of rawTweets) {
        const normalized = normalizeTweet(raw);
        if (normalized) tweets.push(normalized);
        if (tweets.length >= MAX_TWEETS_PER_SOURCE) break;
      }

      sourceStats.push({
        handle: source.x_handle,
        tweets: tweets.length,
        newest: tweets[0]?.createdAt ?? null,
      });

      for (const tweet of tweets) {
        const { error } = await supabase.from("posts").upsert(
          {
            source: "x",
            x_tweet_id: tweet.tweetId,
            x_author_handle: tweet.authorHandle,
            x_author_name: tweet.authorName,
            x_author_avatar: tweet.authorAvatar,
            content: tweet.content,
            media_urls: tweet.mediaUrls,
            video_url: tweet.videoUrl,
            external_url: `https://x.com/${tweet.authorHandle}/status/${tweet.tweetId}`,
            category: source.category,
            created_at: tweet.createdAt,
          },
          { onConflict: "x_tweet_id" }
        );

        if (!error) {
          totalUpserted++;
        } else {
          console.warn(`  Upsert error for ${tweet.tweetId}: ${error.message}`);
        }
      }

      console.log(`  @${source.x_handle}: ${tweets.length} tweets`);
    } catch (err) {
      const msg = `Failed @${source.x_handle}: ${err.message}`;
      console.error(`  ${msg}`);
      errors.push(msg);
      sourceStats.push({ handle: source.x_handle, tweets: 0, newest: null });
    }

    // Rate limit: delay between sources
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SOURCES_MS));
  }

  // Summary
  console.log("\n[scraper] === Summary ===");
  console.log(`  Sources: ${xSources.length}`);
  console.log(`  Total upserted: ${totalUpserted}`);
  console.log(`  Errors: ${errors.length}`);

  const emptySources = sourceStats.filter((s) => s.tweets === 0);
  if (emptySources.length > 0) {
    console.log(`  Empty sources: ${emptySources.map((s) => s.handle).join(", ")}`);
  }

  if (errors.length > 0) {
    console.log("\n  Errors:");
    for (const e of errors) console.log(`    - ${e}`);
  }

  process.exit(errors.length > 0 && totalUpserted === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[scraper] Fatal error:", err);
  process.exit(1);
});
