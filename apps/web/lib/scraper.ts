/**
 * Multi-strategy Twitter/X scraper — replaces the official X API v2.
 *
 * Strategy chain:
 *   1. SearXNG (public instance) — discovers tweet URLs via web search
 *   2. FxTwitter API (api.fxtwitter.com) — enriches tweet data by ID (free, no auth)
 *   3. Nitter RSS (xcancel.com) — fallback for tweet discovery
 *   4. Degraded mode — uses whatever text we got from SearXNG/Nitter directly
 *
 * Requirements:
 *   - SEARXNG_URL env var (public instance URL, e.g. https://search.example.com)
 *     Optional — if not set, skips SearXNG and goes straight to Nitter RSS.
 *   - NITTER_INSTANCE_URL env var (default: https://xcancel.com)
 *
 * No npm dependencies — uses native fetch, AbortController, and regex.
 */

// ============================================================
// Types
// ============================================================

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

/** FxTwitter user response */
interface FxUserResponse {
  code: number;
  message: string;
  user?: FxUser;
}

interface FxUser {
  id: string;
  name: string;
  screen_name: string;
  avatar_url: string;
  banner_url?: string;
  description: string;
  followers: number;
  following: number;
  tweets: number;
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
  createdAt: string;
}

// ============================================================
// Config
// ============================================================

const FXTWITTER_BASE = "https://api.fxtwitter.com";
const SEARXNG_URL = process.env.SEARXNG_URL ?? "";
const NITTER_URL = process.env.NITTER_INSTANCE_URL ?? "https://xcancel.com";

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

function extractTweetFromUrl(url: string): { handle: string; tweetId: string } | null {
  const m = url.match(TWEET_URL_RE);
  return m ? { handle: m[1], tweetId: m[2] } : null;
}

/** Extract tweet ID from a Nitter / xcancel URL */
const NITTER_URL_RE =
  /\/([a-zA-Z0-9_]+)\/status\/(\d+)/;

function extractTweetFromNitterUrl(url: string): { handle: string; tweetId: string } | null {
  const m = url.match(NITTER_URL_RE);
  return m ? { handle: m[1], tweetId: m[2] } : null;
}

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
// Layer 1: SearXNG — Tweet Discovery
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
    console.warn(`SearXNG failed for @${handle}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

// ============================================================
// Layer 2: FxTwitter — Tweet Enrichment
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

    // Collect photo URLs
    if (t.media?.photos) {
      for (const p of t.media.photos) {
        mediaUrls.push(p.url);
      }
    }

    // Collect video thumbnails (actual video available via vxtwitter embed)
    if (t.media?.videos) {
      for (const v of t.media.videos) {
        if (v.thumbnail_url) mediaUrls.push(v.thumbnail_url);
      }
    }

    return {
      tweetId: t.id,
      authorHandle: t.author.screen_name,
      authorName: t.author.name,
      authorAvatar: t.author.avatar_url ?? null,
      content: t.text,
      mediaUrls,
      createdAt: new Date(t.created_timestamp * 1000).toISOString(),
    };
  } catch (err) {
    console.warn(`FxTwitter failed for ${handle}/${tweetId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Fetch user profile (for avatar fallback) */
async function fetchUserProfile(handle: string): Promise<FxUser | null> {
  try {
    const res = await fetchWithTimeout(
      `${FXTWITTER_BASE}/${handle}`,
      { headers: { "User-Agent": BOT_UA } },
      8_000
    );
    if (!res.ok) return null;
    const data: FxUserResponse = await res.json();
    return data.code === 200 ? (data.user ?? null) : null;
  } catch {
    return null;
  }
}

// ============================================================
// Layer 3: Nitter RSS — Fallback Discovery
// ============================================================

interface NitterRSSItem {
  tweetId: string;
  handle: string;
  content: string;
  pubDate: string;
}

async function fetchNitterRSS(handle: string): Promise<NitterRSSItem[]> {
  const urls = [
    `${NITTER_URL}/${handle}/rss`,
    // Fallback to a second instance if primary fails
    `https://nitter.poast.org/${handle}/rss`,
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "application/rss+xml, application/xml, text/xml",
          },
        },
        8_000
      );

      if (!res.ok) continue;

      const xml = await res.text();
      if (!xml.includes("<item>")) continue;

      const items: NitterRSSItem[] = [];
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const itemXml of itemMatches) {
        const link =
          itemXml.match(/<link>(.*?)<\/link>/)?.[1] ??
          itemXml.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1];

        const description =
          itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ??
          itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] ??
          "";

        const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";

        if (!link) continue;

        const parsed = extractTweetFromNitterUrl(link);
        if (!parsed) continue;

        items.push({
          tweetId: parsed.tweetId,
          handle: parsed.handle,
          content: stripHtml(description),
          pubDate,
        });
      }

      if (items.length > 0) return items;
    } catch (err) {
      console.warn(`Nitter RSS failed at ${url}:`, err instanceof Error ? err.message : err);
    }
  }

  return [];
}

// ============================================================
// Main Export — Orchestrates the fallback chain
// ============================================================

export async function fetchRecentTweetsForHandle(
  handle: string,
  maxResults = 5
): Promise<ScrapedTweet[]> {
  const results: ScrapedTweet[] = [];
  const seenIds = new Set<string>();

  // --- Layer 1: SearXNG discovery ---
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

  // --- Layer 2: FxTwitter enrichment for SearXNG discoveries ---
  if (discoveredTweets.length > 0) {
    for (const tweet of discoveredTweets.slice(0, maxResults)) {
      const enriched = await fetchTweetViaFxTwitter(tweet.handle, tweet.tweetId);
      if (enriched) {
        results.push(enriched);
      }
      await delay(500); // Be nice to FxTwitter
    }
    if (results.length > 0) return results;
  }

  // --- Layer 3: Nitter RSS fallback ---
  console.log(`SearXNG yielded no enrichable results for @${handle}, trying Nitter RSS...`);
  const rssItems = await fetchNitterRSS(handle);

  if (rssItems.length === 0) {
    console.warn(`All discovery strategies failed for @${handle}`);
    return [];
  }

  // Get user profile once for avatar
  const profile = await fetchUserProfile(handle);

  for (const item of rssItems.slice(0, maxResults)) {
    if (seenIds.has(item.tweetId)) continue;
    seenIds.add(item.tweetId);

    // Try FxTwitter enrichment
    const enriched = await fetchTweetViaFxTwitter(handle, item.tweetId);
    if (enriched) {
      results.push(enriched);
    } else {
      // Degraded mode: use RSS content + profile avatar
      results.push({
        tweetId: item.tweetId,
        authorHandle: handle,
        authorName: profile?.name ?? handle,
        authorAvatar: profile?.avatar_url ?? null,
        content: item.content,
        mediaUrls: [], // RSS does not provide media URLs
        createdAt: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
      });
    }
    await delay(500);
  }

  return results;
}
