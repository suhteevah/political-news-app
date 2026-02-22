/**
 * Twitter/X scraper — uses @the-convocation/twitter-scraper with auth.
 *
 * Strategy:
 *   1. Attempt authenticated fetch via Twitter's internal GraphQL API
 *   2. Cookie caching in Supabase app_config to avoid re-login each cron run
 *   3. FxTwitter fallback for individual tweet enrichment
 *
 * Required env vars:
 *   - TWITTER_USERNAME
 *   - TWITTER_PASSWORD
 *   - TWITTER_EMAIL (optional, for verification prompts)
 */

import { Scraper, Tweet, Profile } from "@the-convocation/twitter-scraper";
import { Cookie } from "tough-cookie";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Types
// ============================================================

/** Normalized tweet data — maps directly to the posts table */
export interface ScrapedTweet {
  tweetId: string;
  authorHandle: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  mediaUrls: string[];
  /** MP4 video URL (best quality) if the tweet contains video */
  videoUrl: string | null;
  createdAt: string;
}

// ============================================================
// Config
// ============================================================

const COOKIE_CONFIG_KEY = "twitter_scraper_cookies";

// ============================================================
// Supabase admin client (for cookie storage)
// ============================================================

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// Cookie persistence via Supabase app_config
// ============================================================

async function loadCookies(): Promise<string | null> {
  try {
    const supabase = getAdminClient();
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
    console.warn("[scraper] Failed to load cookies:", err);
  }
  return null;
}

async function saveCookies(cookieStrings: string[]): Promise<void> {
  try {
    const supabase = getAdminClient();
    await supabase.from("app_config").upsert(
      {
        key: COOKIE_CONFIG_KEY,
        value: JSON.stringify(cookieStrings),
      },
      { onConflict: "key" }
    );
    console.log("[scraper] Cookies saved to app_config");
  } catch (err) {
    console.warn("[scraper] Failed to save cookies:", err);
  }
}

// ============================================================
// Scraper singleton (reused within a single cron invocation)
// ============================================================

let _scraper: Scraper | null = null;
let _scraperReady = false;

async function getScraper(): Promise<Scraper> {
  if (_scraper && _scraperReady) return _scraper;

  const scraper = new Scraper({
    experimental: {
      xClientTransactionId: true,
      xpff: true,
    },
  });
  _scraper = scraper;

  // Try restoring cookies from DB first
  const savedCookies = await loadCookies();
  if (savedCookies) {
    try {
      const cookieArray: string[] = JSON.parse(savedCookies);
      const parsed = cookieArray
        .map((c) => Cookie.parse(c))
        .filter((c): c is Cookie => c != null);

      if (parsed.length > 0) {
        await scraper.setCookies(parsed);

        if (await scraper.isLoggedIn()) {
          console.log("[scraper] Restored session from cached cookies");
          _scraperReady = true;
          return scraper;
        }
        console.log("[scraper] Cached cookies expired, re-logging in");
      }
    } catch (err) {
      console.warn("[scraper] Cookie restore failed:", err);
    }
  }

  // Fresh login
  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;

  if (!username || !password) {
    throw new Error(
      "[scraper] TWITTER_USERNAME and TWITTER_PASSWORD env vars required"
    );
  }

  console.log(`[scraper] Logging in as @${username}...`);
  await scraper.login(username, password, email);

  if (!(await scraper.isLoggedIn())) {
    throw new Error("[scraper] Login failed — check credentials");
  }

  console.log("[scraper] Login successful, caching cookies");

  // Save cookies for next run
  const cookies = await scraper.getCookies();
  const cookieStrings = cookies.map((c) => c.toString());
  await saveCookies(cookieStrings);

  _scraperReady = true;
  return scraper;
}

// ============================================================
// Tweet normalization
// ============================================================

function normalizeTweet(
  tweet: Tweet,
  avatarUrl: string | null
): ScrapedTweet | null {
  const id = tweet.id;
  const text = tweet.text;
  if (!id || !text) return null;

  // Skip retweets — we want original content only
  if (tweet.isRetweet) return null;

  const mediaUrls: string[] = [];
  let videoUrl: string | null = null;

  // Extract photos
  if (tweet.photos && tweet.photos.length > 0) {
    for (const photo of tweet.photos) {
      if (photo.url) mediaUrls.push(photo.url);
    }
  }

  // Extract videos
  if (tweet.videos && tweet.videos.length > 0) {
    for (const video of tweet.videos) {
      // The library provides preview/thumbnail as the video URL sometimes
      // Look for the actual MP4 URL
      if (video.url) {
        videoUrl = video.url;
      }
      if (video.preview) {
        mediaUrls.push(video.preview);
      }
    }
  }

  // Clean content: remove trailing t.co links
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

// ============================================================
// Main Export — Fetch recent tweets for a handle
// ============================================================

// Profile avatar cache — avoids re-fetching the same profile within a cron run
const _avatarCache = new Map<string, string | null>();

export async function fetchRecentTweetsForHandle(
  handle: string,
  maxResults = 10
): Promise<ScrapedTweet[]> {
  try {
    const scraper = await getScraper();
    const results: ScrapedTweet[] = [];

    // Fetch profile avatar (cached per cron run)
    let avatarUrl: string | null = null;
    if (_avatarCache.has(handle)) {
      avatarUrl = _avatarCache.get(handle) ?? null;
    } else {
      try {
        const profile: Profile = await scraper.getProfile(handle);
        if (profile.avatar) {
          // Get high-res avatar (remove _normal suffix, use _400x400)
          avatarUrl = profile.avatar.replace("_normal", "_400x400");
        }
      } catch (err) {
        console.warn(`[scraper] Failed to fetch profile for @${handle}:`, err);
      }
      _avatarCache.set(handle, avatarUrl);
    }

    // getTweets returns an AsyncGenerator
    const tweetsIter = scraper.getTweets(handle, maxResults);

    for await (const tweet of tweetsIter) {
      const normalized = normalizeTweet(tweet, avatarUrl);
      if (normalized) {
        results.push(normalized);
      }
      if (results.length >= maxResults) break;
    }

    if (results.length > 0) {
      console.log(
        `[scraper] Got ${results.length} tweets for @${handle}`
      );
    } else {
      console.warn(`[scraper] No tweets found for @${handle}`);
    }

    return results;
  } catch (err) {
    console.error(
      `[scraper] Failed for @${handle}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

/**
 * Diagnostic: test scraper login and fetch one handle. Returns detailed status.
 */
export async function diagnoseScraper(handle = "Breaking911"): Promise<{
  loggedIn: boolean;
  loginMethod: string;
  tweetCount: number;
  firstTweet: string | null;
  avatarUrl: string | null;
  error: string | null;
}> {
  const result = {
    loggedIn: false,
    loginMethod: "unknown",
    tweetCount: 0,
    firstTweet: null as string | null,
    avatarUrl: null as string | null,
    error: null as string | null,
  };

  try {
    const scraper = await getScraper();
    result.loggedIn = await scraper.isLoggedIn();
    result.loginMethod = result.loggedIn ? "authenticated" : "guest";

    // Try fetching profile
    try {
      const profile = await scraper.getProfile(handle);
      result.avatarUrl = profile.avatar ?? null;
    } catch (err) {
      result.error = `Profile fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Try fetching tweets
    const tweets: ScrapedTweet[] = [];
    const iter = scraper.getTweets(handle, 3);
    for await (const tweet of iter) {
      const normalized = normalizeTweet(tweet, result.avatarUrl);
      if (normalized) tweets.push(normalized);
      if (tweets.length >= 3) break;
    }
    result.tweetCount = tweets.length;
    result.firstTweet = tweets[0]?.content?.substring(0, 100) ?? null;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

// ============================================================
// Utility exports
// ============================================================

/**
 * Transform a twitter/x URL into a vxtwitter/fixvx URL for embeddable video.
 */
export function toVideoEmbedUrl(tweetUrl: string): string {
  return tweetUrl
    .replace("twitter.com", "vxtwitter.com")
    .replace("x.com", "fixvx.com");
}

/**
 * Reset the scraper singleton (useful if cookies become invalid mid-run).
 */
export function resetScraper(): void {
  _scraper = null;
  _scraperReady = false;
}
