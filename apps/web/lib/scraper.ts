/**
 * Multi-strategy Twitter/X scraper — replaces the official X API v2.
 *
 * Strategy chain:
 *   1. Twitter Syndication API — discovers tweets via public embed endpoint
 *   2. FxTwitter API (api.fxtwitter.com) — enrichment fallback (free, no auth)
 *   3. SearXNG (optional) — additional discovery via web search
 *
 * Requirements:
 *   - SEARXNG_URL env var (optional — public instance URL)
 *
 * No npm dependencies — uses native fetch, AbortController, and regex.
 */

// ============================================================
// Types
// ============================================================

/** Twitter Syndication timeline entry */
interface SyndicationEntry {
  type: string;
  entry_id: string;
  sort_index: string;
  content?: {
    tweet?: SyndicationTweet;
  };
}

interface SyndicationTweet {
  id_str: string;
  full_text?: string;
  text?: string;
  created_at: string;
  user?: {
    id_str: string;
    name: string;
    screen_name: string;
    profile_image_url_https: string;
  };
  entities?: {
    media?: SyndicationMedia[];
  };
  extended_entities?: {
    media?: SyndicationMedia[];
  };
}

interface SyndicationMedia {
  type: string;
  media_url_https?: string;
  url?: string;
  video_info?: {
    variants?: Array<{
      url: string;
      content_type: string;
      bitrate?: number;
    }>;
  };
}

/** FxTwitter status response */
interface FxTweetResponse {
  code: number;
  message: string;
  tweet?: FxTweet;
}

interface FxTweet {
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;
  likes: number;
  retweets: number;
  replies: number;
  views: number | null;
  lang: string | null;
  possibly_sensitive: boolean;
  author: FxAuthor;
  media?: FxMedia;
  quote?: FxTweet;
}

interface FxAuthor {
  id: string;
  name: string;
  screen_name: string;
  avatar_url: string;
  banner_url?: string;
}

interface FxMedia {
  photos?: FxPhoto[];
  videos?: FxVideo[];
  all?: Array<FxPhoto | FxVideo>;
}

interface FxPhoto {
  type: "photo";
  url: string;
  width: number;
  height: number;
  altText: string;
}

interface FxVideo {
  type: "video" | "gif";
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  duration: number;
}

/** SearXNG JSON response */
interface SearXNGResponse {
  query: string;
  results: SearXNGResult[];
}

interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  publishedDate?: string;
}

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

const FXTWITTER_BASE = "https://api.fxtwitter.com";
const SYNDICATION_BASE =
  "https://syndication.twitter.com/srv/timeline-profile/screen-name";
const SEARXNG_URL = process.env.SEARXNG_URL ?? "";

const BOT_UA = "TheRightWire/1.0 (news-aggregator)";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ============================================================
// Utilities
// ============================================================

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with timeout using AbortController */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extract tweet ID and handle from a twitter.com / x.com URL */
const TWEET_URL_RE =
  /(?:https?:\/\/)?(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/;

function extractTweetFromUrl(
  url: string
): { handle: string; tweetId: string } | null {
  const m = url.match(TWEET_URL_RE);
  return m ? { handle: m[1], tweetId: m[2] } : null;
}

/**
 * Transform a twitter/x URL into a vxtwitter/fixvx URL for embeddable video.
 * Useful for generating video embed URLs.
 */
export function toVideoEmbedUrl(tweetUrl: string): string {
  return tweetUrl
    .replace("twitter.com", "vxtwitter.com")
    .replace("x.com", "fixvx.com");
}

// ============================================================
// Layer 1: Twitter Syndication API — Primary Discovery
// ============================================================

async function fetchViaSyndication(
  handle: string,
  maxResults: number
): Promise<ScrapedTweet[]> {
  try {
    const res = await fetchWithTimeout(
      `${SYNDICATION_BASE}/${handle}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html",
        },
      },
      15_000
    );

    if (!res.ok) {
      console.warn(
        `Syndication returned ${res.status} for @${handle}`
      );
      return [];
    }

    const html = await res.text();

    // Extract __NEXT_DATA__ JSON from the SSR HTML
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
    );
    if (!match) {
      console.warn(`No __NEXT_DATA__ found in syndication response for @${handle}`);
      return [];
    }

    const data = JSON.parse(match[1]);
    const entries: SyndicationEntry[] =
      data.props?.pageProps?.timeline?.entries ?? [];

    if (entries.length === 0) {
      console.warn(`Syndication returned 0 entries for @${handle}`);
      return [];
    }

    console.log(
      `Syndication found ${entries.length} entries for @${handle}`
    );

    const results: ScrapedTweet[] = [];

    // Filter to tweet entries only (skip tombstones, ads, etc.)
    // Sort by sort_index descending (most recent first)
    const tweetEntries = entries
      .filter(
        (e) =>
          e.type === "tweet" &&
          e.content?.tweet?.user?.screen_name?.toLowerCase() ===
            handle.toLowerCase()
      )
      .sort((a, b) => {
        const aIdx = BigInt(a.sort_index || "0");
        const bIdx = BigInt(b.sort_index || "0");
        return bIdx > aIdx ? 1 : bIdx < aIdx ? -1 : 0;
      });

    for (const entry of tweetEntries.slice(0, maxResults)) {
      const tweet = entry.content?.tweet;
      if (!tweet) continue;

      const text = tweet.full_text || tweet.text || "";
      if (!text) continue;

      // Collect media URLs and video URL
      const mediaUrls: string[] = [];
      let videoUrl: string | null = null;
      const allMedia = [
        ...(tweet.extended_entities?.media ?? []),
        ...(tweet.entities?.media ?? []),
      ];
      const seenMediaUrls = new Set<string>();

      for (const m of allMedia) {
        // Extract best quality MP4 video URL
        if (
          (m.type === "video" || m.type === "animated_gif") &&
          m.video_info?.variants
        ) {
          const mp4s = m.video_info.variants
            .filter((v) => v.content_type === "video/mp4" && v.bitrate != null)
            .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
          if (mp4s.length > 0) {
            videoUrl = mp4s[0].url;
          }
          // Store thumbnail for the video
          const thumb = m.media_url_https || m.url || "";
          if (thumb && !seenMediaUrls.has(thumb)) {
            seenMediaUrls.add(thumb);
            mediaUrls.push(thumb);
          }
        } else {
          const url = m.media_url_https || m.url || "";
          if (url && !seenMediaUrls.has(url)) {
            seenMediaUrls.add(url);
            mediaUrls.push(url);
          }
        }
      }

      results.push({
        tweetId: tweet.id_str || entry.entry_id.replace("tweet-", ""),
        authorHandle: tweet.user?.screen_name ?? handle,
        authorName: tweet.user?.name ?? handle,
        authorAvatar: tweet.user?.profile_image_url_https
          ? tweet.user.profile_image_url_https.replace("_normal", "_400x400")
          : null,
        content: text.replace(/https:\/\/t\.co\/\w+$/g, "").trim(),
        mediaUrls,
        videoUrl,
        createdAt: tweet.created_at
          ? new Date(tweet.created_at).toISOString()
          : new Date().toISOString(),
      });
    }

    return results;
  } catch (err) {
    console.warn(
      `Syndication failed for @${handle}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// ============================================================
// Layer 2: FxTwitter — Enrichment / Fallback
// ============================================================

async function fetchTweetViaFxTwitter(
  handle: string,
  tweetId: string
): Promise<ScrapedTweet | null> {
  try {
    const res = await fetchWithTimeout(
      `${FXTWITTER_BASE}/${handle}/status/${tweetId}`,
      { headers: { "User-Agent": BOT_UA } },
      8_000
    );

    if (!res.ok) return null;

    const data: FxTweetResponse = await res.json();
    if (data.code !== 200 || !data.tweet) return null;

    const t = data.tweet;
    const mediaUrls: string[] = [];
    let videoUrl: string | null = null;

    if (t.media?.photos) {
      for (const p of t.media.photos) {
        mediaUrls.push(p.url);
      }
    }

    if (t.media?.videos) {
      for (const v of t.media.videos) {
        if (v.thumbnail_url) mediaUrls.push(v.thumbnail_url);
        // FxTwitter provides direct MP4 URLs for videos
        if (v.url) videoUrl = v.url;
      }
    }

    return {
      tweetId: t.id,
      authorHandle: t.author.screen_name,
      authorName: t.author.name,
      authorAvatar: t.author.avatar_url ?? null,
      content: t.text,
      mediaUrls,
      videoUrl,
      createdAt: new Date(t.created_timestamp * 1000).toISOString(),
    };
  } catch (err) {
    console.warn(
      `FxTwitter failed for ${handle}/${tweetId}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ============================================================
// Layer 3: SearXNG — Additional Discovery (Optional)
// ============================================================

async function searchSearXNG(handle: string): Promise<SearXNGResult[]> {
  if (!SEARXNG_URL) return [];

  try {
    const params = new URLSearchParams({
      q: `from:@${handle} site:x.com OR site:twitter.com`,
      format: "json",
      categories: "general",
      time_range: "week",
      pageno: "1",
    });

    const res = await fetchWithTimeout(
      `${SEARXNG_URL}/search?${params}`,
      { headers: { "User-Agent": BOT_UA, Accept: "application/json" } },
      10_000
    );

    if (!res.ok) {
      console.warn(`SearXNG returned ${res.status} for @${handle}`);
      return [];
    }

    const data: SearXNGResponse = await res.json();
    return data.results ?? [];
  } catch (err) {
    console.warn(
      `SearXNG failed for @${handle}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// ============================================================
// Main Export — Orchestrates the fallback chain
// ============================================================

export async function fetchRecentTweetsForHandle(
  handle: string,
  maxResults = 5
): Promise<ScrapedTweet[]> {
  const seenIds = new Set<string>();

  // --- Layer 1: Twitter Syndication API (primary) ---
  const syndicationResults = await fetchViaSyndication(handle, maxResults);

  if (syndicationResults.length > 0) {
    console.log(
      `Got ${syndicationResults.length} tweets for @${handle} via Syndication`
    );
    return syndicationResults;
  }

  // --- Layer 2: SearXNG discovery + FxTwitter enrichment ---
  const searxResults = await searchSearXNG(handle);
  const discoveredTweets: Array<{ handle: string; tweetId: string }> = [];

  for (const result of searxResults) {
    const parsed = extractTweetFromUrl(result.url);
    if (parsed && !seenIds.has(parsed.tweetId)) {
      seenIds.add(parsed.tweetId);
      discoveredTweets.push(parsed);
    }
    if (discoveredTweets.length >= maxResults) break;
  }

  if (discoveredTweets.length > 0) {
    const results: ScrapedTweet[] = [];
    for (const tweet of discoveredTweets.slice(0, maxResults)) {
      const enriched = await fetchTweetViaFxTwitter(
        tweet.handle,
        tweet.tweetId
      );
      if (enriched) {
        results.push(enriched);
      }
      await delay(500);
    }
    if (results.length > 0) {
      console.log(
        `Got ${results.length} tweets for @${handle} via SearXNG + FxTwitter`
      );
      return results;
    }
  }

  console.warn(`All strategies failed for @${handle}`);
  return [];
}
