/**
 * Twitter/X scraper — uses Twitter's syndication API (no auth required).
 *
 * Strategy:
 *   Fetch the public syndication timeline endpoint which returns recent tweets
 *   as embedded __NEXT_DATA__ JSON. Works from any IP without authentication.
 *   Includes retry logic with exponential backoff for 429 rate limits.
 *
 * Endpoint: https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}
 *
 * No env vars required.
 */

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

/** Raw tweet shape from the syndication __NEXT_DATA__ JSON */
interface SyndicationTweet {
  id_str?: string;
  full_text?: string;
  created_at?: string;
  retweeted_status?: unknown;
  user?: {
    screen_name?: string;
    name?: string;
    profile_image_url_https?: string;
  };
  entities?: {
    media?: SyndicationMedia[];
  };
  extended_entities?: {
    media?: SyndicationMedia[];
  };
}

interface SyndicationMedia {
  type?: string;
  media_url_https?: string;
  video_info?: {
    variants?: Array<{
      content_type?: string;
      bitrate?: number;
      url?: string;
    }>;
  };
}

// ============================================================
// Config
// ============================================================

const SYNDICATION_BASE =
  "https://syndication.twitter.com/srv/timeline-profile/screen-name";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Max retries for 429 rate limits */
const MAX_RETRIES = 2;

/** Base delay in ms for exponential backoff */
const BASE_RETRY_DELAY_MS = 5000;

// ============================================================
// Retry helper
// ============================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic for 429 rate limits.
 * Uses exponential backoff: 5s, 10s, 20s between retries.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    lastResponse = response;

    if (attempt < maxRetries) {
      // Check for Retry-After header
      const retryAfter = response.headers.get("retry-after");
      let delayMs: number;

      if (retryAfter) {
        // Retry-After can be seconds or a date
        const seconds = parseInt(retryAfter, 10);
        delayMs = isNaN(seconds) ? BASE_RETRY_DELAY_MS * Math.pow(2, attempt) : seconds * 1000;
      } else {
        delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      }

      console.log(
        `[scraper] Rate limited (429), retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`
      );
      await sleep(delayMs);
    }
  }

  // All retries exhausted, return last 429 response
  return lastResponse!;
}

// ============================================================
// Syndication fetcher
// ============================================================

/**
 * Fetch the syndication timeline page and extract tweets from __NEXT_DATA__.
 * Returns up to ~20 recent tweets (whatever Twitter embeds in the page).
 * Always retries on 429 (1 retry with 3s delay for bulk, more for diagnostic).
 */
async function fetchSyndicationTimeline(
  handle: string
): Promise<SyndicationTweet[]> {
  const url = `${SYNDICATION_BASE}/${handle}`;

  const response = await fetchWithRetry(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      // Referer/Origin simulate an embedded Twitter widget on our site.
      // Without these, syndication.twitter.com returns 429 for datacenter IPs.
      Referer: "https://the-right-wire.com/",
      Origin: "https://the-right-wire.com",
    },
    // No caching — always get fresh data
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Syndication fetch failed for @${handle}: HTTP ${response.status}`
    );
  }

  const html = await response.text();

  // Extract __NEXT_DATA__ JSON from the HTML
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match || !match[1]) {
    throw new Error(
      `No __NEXT_DATA__ found in syndication response for @${handle}`
    );
  }

  const data = JSON.parse(match[1]);
  const entries: Array<{
    type?: string;
    content?: { tweet?: SyndicationTweet };
  }> = data?.props?.pageProps?.timeline?.entries ?? [];

  // Filter to tweet entries only (skip cursors, etc.)
  return entries
    .filter((e) => e.type === "tweet" && e.content?.tweet)
    .map((e) => e.content!.tweet!);
}

// ============================================================
// Tweet normalization
// ============================================================

function normalizeSyndicationTweet(
  tweet: SyndicationTweet
): ScrapedTweet | null {
  const id = tweet.id_str;
  const text = tweet.full_text;
  if (!id || !text) return null;

  // Skip retweets — we want original content only
  if (tweet.retweeted_status) return null;
  if (text.startsWith("RT @")) return null;

  const mediaUrls: string[] = [];
  let videoUrl: string | null = null;

  // Use extended_entities for media (more complete than entities)
  const mediaList =
    tweet.extended_entities?.media ?? tweet.entities?.media ?? [];

  for (const media of mediaList) {
    if (media.type === "photo" && media.media_url_https) {
      mediaUrls.push(media.media_url_https);
    } else if (
      (media.type === "video" || media.type === "animated_gif") &&
      media.video_info?.variants
    ) {
      // Find the best quality MP4
      const mp4Variants = media.video_info.variants
        .filter((v) => v.content_type === "video/mp4" && v.url)
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

      if (mp4Variants.length > 0) {
        videoUrl = mp4Variants[0].url!;
      }

      // Use the thumbnail as a media URL
      if (media.media_url_https) {
        mediaUrls.push(media.media_url_https);
      }
    }
  }

  // Clean content: remove trailing t.co links
  const cleanContent = text.replace(/\s*https:\/\/t\.co\/\w+$/g, "").trim();

  // Parse the Twitter date format: "Sun Feb 22 00:38:56 +0000 2026"
  let createdAt: string;
  try {
    createdAt = tweet.created_at
      ? new Date(tweet.created_at).toISOString()
      : new Date().toISOString();
  } catch {
    createdAt = new Date().toISOString();
  }

  // Get avatar URL (upgrade to higher resolution)
  let avatarUrl: string | null = null;
  if (tweet.user?.profile_image_url_https) {
    avatarUrl = tweet.user.profile_image_url_https.replace(
      "_normal",
      "_400x400"
    );
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

// ============================================================
// Main Export — Fetch recent tweets for a handle
// ============================================================

export async function fetchRecentTweetsForHandle(
  handle: string,
  maxResults = 10
): Promise<ScrapedTweet[]> {
  try {
    const rawTweets = await fetchSyndicationTimeline(handle);
    const results: ScrapedTweet[] = [];

    for (const tweet of rawTweets) {
      const normalized = normalizeSyndicationTweet(tweet);
      if (normalized) {
        results.push(normalized);
      }
      if (results.length >= maxResults) break;
    }

    if (results.length > 0) {
      console.log(`[scraper] Got ${results.length} tweets for @${handle}`);
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
 * Diagnostic: test syndication scraper for a handle. Returns detailed status.
 */
export async function diagnoseScraper(handle = "Breaking911"): Promise<{
  method: string;
  rawEntries: number;
  tweetCount: number;
  firstTweet: string | null;
  newestDate: string | null;
  avatarUrl: string | null;
  httpStatus: number | null;
  error: string | null;
}> {
  const result = {
    method: "syndication",
    rawEntries: 0,
    tweetCount: 0,
    firstTweet: null as string | null,
    newestDate: null as string | null,
    avatarUrl: null as string | null,
    httpStatus: null as number | null,
    error: null as string | null,
  };

  try {
    // Test the raw syndication endpoint directly (with retry for diagnostic)
    const url = `${SYNDICATION_BASE}/${handle}`;
    const response = await fetchWithRetry(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://the-right-wire.com/",
        Origin: "https://the-right-wire.com",
      },
      cache: "no-store",
    });

    result.httpStatus = response.status;

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      return result;
    }

    const html = await response.text();
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );

    if (!match || !match[1]) {
      result.error = `No __NEXT_DATA__ found (html length: ${html.length})`;
      return result;
    }

    const data = JSON.parse(match[1]);
    const entries: Array<{
      type?: string;
      content?: { tweet?: SyndicationTweet };
    }> = data?.props?.pageProps?.timeline?.entries ?? [];

    result.rawEntries = entries.length;

    // Normalize tweets
    const tweets: ScrapedTweet[] = [];
    for (const entry of entries) {
      if (entry.type === "tweet" && entry.content?.tweet) {
        const normalized = normalizeSyndicationTweet(entry.content.tweet);
        if (normalized) tweets.push(normalized);
        if (tweets.length >= 5) break;
      }
    }

    result.tweetCount = tweets.length;
    if (tweets.length > 0) {
      result.firstTweet = tweets[0].content.substring(0, 100);
      result.newestDate = tweets[0].createdAt;
      result.avatarUrl = tweets[0].authorAvatar;
    }
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
