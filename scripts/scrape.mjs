#!/usr/bin/env node
/**
 * Standalone Twitter/X scraper script.
 * Runs on GitHub Actions runners (not Vercel) to avoid Cloudflare IP blocks.
 *
 * RSS/YouTube scraping still happens via the Vercel endpoint since it
 * doesn't have IP blocking issues.
 *
 * Required env vars:
 *   TWITTER_USERNAME, TWITTER_PASSWORD
 *   TWITTER_EMAIL (optional, for verification prompts)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/scrape.mjs
 */

import { Scraper } from "@the-convocation/twitter-scraper";
import { Cookie } from "tough-cookie";
import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────────

const COOKIE_CONFIG_KEY = "twitter_scraper_cookies";
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

// ── Cookie persistence ──────────────────────────────────────────

async function loadCookies() {
  try {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", COOKIE_CONFIG_KEY)
      .maybeSingle();
    if (data?.value) {
      return typeof data.value === "string"
        ? data.value
        : JSON.stringify(data.value);
    }
  } catch (err) {
    console.warn("[scraper] Failed to load cookies:", err.message);
  }
  return null;
}

async function saveCookies(cookieStrings) {
  try {
    await supabase.from("app_config").upsert(
      { key: COOKIE_CONFIG_KEY, value: JSON.stringify(cookieStrings) },
      { onConflict: "key" }
    );
    console.log("[scraper] Cookies saved to app_config");
  } catch (err) {
    console.warn("[scraper] Failed to save cookies:", err.message);
  }
}

// ── Scraper setup ───────────────────────────────────────────────

async function createAuthenticatedScraper() {
  const scraper = new Scraper({
    experimental: {
      xClientTransactionId: true,
      xpff: true,
    },
  });

  // Try restoring cookies from DB
  const savedCookies = await loadCookies();
  if (savedCookies) {
    try {
      const cookieArray = JSON.parse(savedCookies);
      const parsed = cookieArray
        .map((c) => Cookie.parse(c))
        .filter((c) => c != null);

      if (parsed.length > 0) {
        await scraper.setCookies(parsed);
        if (await scraper.isLoggedIn()) {
          console.log("[scraper] Restored session from cached cookies");
          return scraper;
        }
        console.log("[scraper] Cached cookies expired, re-logging in");
      }
    } catch (err) {
      console.warn("[scraper] Cookie restore failed:", err.message);
    }
  }

  // Fresh login
  const username = process.env.TWITTER_USERNAME?.trim();
  const password = process.env.TWITTER_PASSWORD?.trim();
  const email = process.env.TWITTER_EMAIL?.trim();

  if (!username || !password) {
    throw new Error("TWITTER_USERNAME and TWITTER_PASSWORD env vars required");
  }

  console.log(`[scraper] Logging in as @${username}...`);
  await scraper.login(username, password, email || undefined);

  if (!(await scraper.isLoggedIn())) {
    throw new Error("Login failed — check credentials");
  }

  console.log("[scraper] Login successful, caching cookies");
  const cookies = await scraper.getCookies();
  await saveCookies(cookies.map((c) => c.toString()));

  return scraper;
}

// ── Tweet normalization ─────────────────────────────────────────

function normalizeTweet(tweet, avatarUrl) {
  const id = tweet.id;
  const text = tweet.text;
  if (!id || !text) return null;
  if (tweet.isRetweet) return null;

  const mediaUrls = [];
  let videoUrl = null;

  if (tweet.photos?.length > 0) {
    for (const photo of tweet.photos) {
      if (photo.url) mediaUrls.push(photo.url);
    }
  }

  if (tweet.videos?.length > 0) {
    for (const video of tweet.videos) {
      if (video.url) videoUrl = video.url;
      if (video.preview) mediaUrls.push(video.preview);
    }
  }

  const cleanContent = text.replace(/\s*https:\/\/t\.co\/\w+$/g, "").trim();

  return {
    tweetId: id,
    authorHandle: tweet.username ?? "",
    authorName: tweet.name ?? tweet.username ?? "",
    authorAvatar: avatarUrl,
    content: cleanContent,
    mediaUrls,
    videoUrl,
    createdAt: tweet.timeParsed
      ? tweet.timeParsed.toISOString()
      : new Date().toISOString(),
  };
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("[scraper] Starting X/Twitter scrape run...");
  const startTime = Date.now();

  let totalTweetsFetched = 0;
  let totalNewPosts = 0;
  let totalUpserted = 0;
  const errors = [];
  const sourceStats = [];

  // Authenticate
  let scraper;
  try {
    scraper = await createAuthenticatedScraper();
  } catch (err) {
    console.error("[scraper] Auth failed:", err.message);
    process.exit(1);
  }

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

  const avatarCache = new Map();

  for (const source of xSources) {
    try {
      // Fetch avatar (cached per run)
      let avatarUrl = null;
      if (avatarCache.has(source.x_handle)) {
        avatarUrl = avatarCache.get(source.x_handle);
      } else {
        try {
          const profile = await scraper.getProfile(source.x_handle);
          if (profile.avatar) {
            avatarUrl = profile.avatar.replace("_normal", "_400x400");
          }
        } catch (err) {
          console.warn(
            `[scraper] Profile fetch failed for @${source.x_handle}: ${err.message}`
          );
        }
        avatarCache.set(source.x_handle, avatarUrl);
      }

      // Fetch tweets
      const tweets = [];
      const iter = scraper.getTweets(source.x_handle, MAX_TWEETS_PER_SOURCE);
      for await (const tweet of iter) {
        const normalized = normalizeTweet(tweet, avatarUrl);
        if (normalized) tweets.push(normalized);
        if (tweets.length >= MAX_TWEETS_PER_SOURCE) break;
      }

      totalTweetsFetched += tweets.length;
      const stat = { handle: source.x_handle, tweets: tweets.length };

      if (tweets.length > 0) {
        const sorted = [...tweets].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        stat.newest = sorted[0].createdAt;
        stat.oldest = sorted[sorted.length - 1].createdAt;
      }

      sourceStats.push(stat);

      // Upsert tweets into posts table
      for (const tweet of tweets) {
        const { data: existing } = await supabase
          .from("posts")
          .select("id")
          .eq("x_tweet_id", tweet.tweetId)
          .maybeSingle();

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
          if (!existing) totalNewPosts++;
        } else {
          console.warn(
            `[scraper] Upsert error for tweet ${tweet.tweetId}: ${error.message}`
          );
        }
      }

      console.log(`[scraper] @${source.x_handle}: ${tweets.length} tweets`);
    } catch (err) {
      const msg = `Failed @${source.x_handle}: ${err.message}`;
      console.error(`[scraper] ${msg}`);
      errors.push(msg);
      sourceStats.push({ handle: source.x_handle, tweets: 0 });
    }

    // Rate-limit delay between sources
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SOURCES_MS));
  }

  // ── Summary ──

  const newestTweetDates = sourceStats
    .filter((s) => s.newest)
    .map((s) => new Date(s.newest).getTime());
  const newestTweetTime =
    newestTweetDates.length > 0 ? Math.max(...newestTweetDates) : null;
  const staleMinutes = newestTweetTime
    ? Math.round((Date.now() - newestTweetTime) / 60000)
    : null;
  const emptySources = sourceStats.filter((s) => s.tweets === 0);

  const summary = {
    duration: `${Math.round((Date.now() - startTime) / 1000)}s`,
    tweetsFetched: totalTweetsFetched,
    newPosts: totalNewPosts,
    totalUpserted,
    staleMinutes,
    newestTweet: newestTweetTime
      ? new Date(newestTweetTime).toISOString()
      : null,
    emptySources:
      emptySources.length > 0 ? emptySources.map((s) => s.handle) : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };

  console.log("\n[scraper] ═══ SUMMARY ═══");
  console.log(JSON.stringify(summary, null, 2));

  // Exit with error if auth worked but got zero tweets from all sources
  if (totalTweetsFetched === 0 && errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[scraper] Fatal error:", err);
  process.exit(1);
});
