/**
 * RSS & YouTube Feed Scraper — ingests content from podcast feeds, YouTube channels,
 * and other RSS/Atom sources into the posts table.
 *
 * Supported feed types:
 *   1. Buzzsprout / Generic RSS (podcast episodes, blog posts)
 *   2. YouTube Atom feeds (channel video uploads)
 *   3. Telegram public channel previews (via t.me/s/ endpoint)
 *
 * No npm dependencies — uses native fetch + regex XML parsing.
 */

// ============================================================
// Types
// ============================================================

export interface RSSFeedConfig {
  /** Unique identifier for this feed source */
  id: string;
  /** Display name shown in the app */
  displayName: string;
  /** Avatar URL for the source */
  avatarUrl: string | null;
  /** Feed URL (RSS/Atom XML endpoint) */
  feedUrl: string;
  /** Type of feed */
  feedType: "rss" | "youtube" | "telegram";
  /** Category to assign posts */
  category: string;
  /** Whether this feed is active */
  isActive: boolean;
}

export interface ScrapedFeedItem {
  /** Unique ID for deduplication (guid, video ID, message ID) */
  sourceId: string;
  /** Source type: 'rss' or 'youtube' */
  source: "rss" | "youtube";
  /** Display name of the content author/channel */
  authorName: string;
  /** Author handle (for display consistency) */
  authorHandle: string;
  /** Author avatar URL */
  authorAvatar: string | null;
  /** Main text content (description, summary, or full text) */
  content: string;
  /** External URL to the original content */
  externalUrl: string;
  /** Media URLs (thumbnails, images) */
  mediaUrls: string[];
  /** Category tag */
  category: string;
  /** Publication date as ISO string */
  createdAt: string;
}

// ============================================================
// Config — Registered feed sources
// ============================================================

/**
 * All registered RSS/YouTube/Telegram feeds.
 * Add new sources here to automatically include them in the scraping cycle.
 */
export const FEED_SOURCES: RSSFeedConfig[] = [
  {
    id: "s2-underground-podcast",
    displayName: "S2 Underground",
    avatarUrl: null, // Will be populated from feed if available
    feedUrl: "https://rss.buzzsprout.com/868255.rss",
    feedType: "rss",
    category: "World",
    isActive: true,
  },
  {
    id: "s2-underground-youtube",
    displayName: "S2 Underground",
    avatarUrl: null,
    feedUrl:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCTq1zHztiV69Ur8t6jco4CQ",
    feedType: "youtube",
    category: "World",
    isActive: true,
  },
];

// ============================================================
// Utilities
// ============================================================

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract text content between XML tags using regex.
 * Handles CDATA sections and basic entity decoding.
 */
function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRe = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  // Regular tag content
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return "";

  return decodeEntities(match[1].trim());
}

/** Extract an attribute value from a tag */
function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const match = xml.match(re);
  return match ? match[1] : "";
}

/** Decode basic XML/HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extract image URLs from HTML content */
function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src="([^"]+)"/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    if (match[1] && !match[1].includes("spacer") && !match[1].includes("pixel")) {
      urls.push(match[1]);
    }
  }
  return urls;
}

/** Truncate content to a sensible length for feed display */
function truncateContent(text: string, maxLength = 500): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + "...";
}

// ============================================================
// RSS Feed Parser (Buzzsprout, generic RSS 2.0)
// ============================================================

async function fetchRSSFeed(
  config: RSSFeedConfig,
  maxItems = 20
): Promise<ScrapedFeedItem[]> {
  try {
    const res = await fetchWithTimeout(config.feedUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!res.ok) {
      console.warn(`RSS feed returned ${res.status} for ${config.id}`);
      return [];
    }

    const xml = await res.text();
    const results: ScrapedFeedItem[] = [];

    // Extract channel-level image for avatar
    let channelAvatar = config.avatarUrl;
    const channelImageMatch = xml.match(
      /<channel>[\s\S]*?<image>[\s\S]*?<url>([^<]+)<\/url>/i
    );
    if (channelImageMatch) {
      channelAvatar = channelImageMatch[1].trim();
    }
    // Also try itunes:image
    if (!channelAvatar) {
      const itunesImage = extractAttr(xml, "itunes:image", "href");
      if (itunesImage) channelAvatar = itunesImage;
    }

    // Split into individual <item> elements
    const items = xml.split(/<item>/i).slice(1); // Skip channel header

    for (const itemXml of items.slice(0, maxItems)) {
      const title = extractTag(itemXml, "title");
      const description = extractTag(itemXml, "description");
      const link = extractTag(itemXml, "link");
      const guid =
        extractTag(itemXml, "guid") || link || `${config.id}-${title}`;
      const pubDate = extractTag(itemXml, "pubDate");

      // Try to get content:encoded for richer content
      const contentEncoded = extractTag(itemXml, "content:encoded");
      const rawContent = contentEncoded || description || "";

      // Extract images from HTML content
      const images = extractImagesFromHtml(rawContent);

      // Also check for enclosure (podcast audio, images)
      const enclosureUrl = extractAttr(itemXml, "enclosure", "url");

      // Try itunes:image for episode artwork
      const episodeImage = extractAttr(itemXml, "itunes:image", "href");
      if (episodeImage && !images.includes(episodeImage)) {
        images.unshift(episodeImage);
      }

      // Build the content: title + clean description
      const cleanDescription = stripHtml(rawContent);
      const displayContent = title
        ? `${title}\n\n${truncateContent(cleanDescription)}`
        : truncateContent(cleanDescription);

      if (!displayContent.trim()) continue;

      results.push({
        sourceId: guid,
        source: "rss",
        authorName: config.displayName,
        authorHandle: config.id,
        authorAvatar: channelAvatar,
        content: displayContent,
        externalUrl: link,
        mediaUrls: images,
        category: config.category,
        createdAt: pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString(),
      });
    }

    console.log(
      `RSS: fetched ${results.length} items from ${config.id}`
    );
    return results;
  } catch (err) {
    console.warn(
      `RSS fetch failed for ${config.id}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// ============================================================
// YouTube Atom Feed Parser
// ============================================================

async function fetchYouTubeFeed(
  config: RSSFeedConfig,
  maxItems = 15
): Promise<ScrapedFeedItem[]> {
  try {
    const res = await fetchWithTimeout(config.feedUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/atom+xml, application/xml, text/xml",
      },
    });

    if (!res.ok) {
      console.warn(`YouTube feed returned ${res.status} for ${config.id}`);
      return [];
    }

    const xml = await res.text();
    const results: ScrapedFeedItem[] = [];

    // Extract channel thumbnail from author info
    let channelAvatar = config.avatarUrl;

    // Split into individual <entry> elements
    const entries = xml.split(/<entry>/i).slice(1);

    for (const entryXml of entries.slice(0, maxItems)) {
      const videoId = extractTag(entryXml, "yt:videoId");
      const title = extractTag(entryXml, "title");
      const published = extractTag(entryXml, "published");
      const updated = extractTag(entryXml, "updated");

      // Media group contains description and thumbnail
      const description = extractTag(entryXml, "media:description");
      const thumbnailUrl = extractAttr(
        entryXml,
        "media:thumbnail",
        "url"
      );

      if (!videoId || !title) continue;

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const mediaUrls: string[] = [];

      // Use high-quality thumbnail
      if (thumbnailUrl) {
        mediaUrls.push(thumbnailUrl);
      } else {
        // Default YouTube thumbnail URL
        mediaUrls.push(
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        );
      }

      const displayContent = description
        ? `${title}\n\n${truncateContent(stripHtml(description), 300)}`
        : title;

      results.push({
        sourceId: `yt-${videoId}`,
        source: "youtube",
        authorName: config.displayName,
        authorHandle: config.id,
        authorAvatar: channelAvatar,
        content: displayContent,
        externalUrl: videoUrl,
        mediaUrls,
        category: config.category,
        createdAt: published || updated || new Date().toISOString(),
      });
    }

    console.log(
      `YouTube: fetched ${results.length} items from ${config.id}`
    );
    return results;
  } catch (err) {
    console.warn(
      `YouTube fetch failed for ${config.id}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// ============================================================
// Main Export — Fetch all active feeds
// ============================================================

/**
 * Fetch items from a single feed config.
 */
export async function fetchFeedItems(
  config: RSSFeedConfig,
  maxItems = 20
): Promise<ScrapedFeedItem[]> {
  switch (config.feedType) {
    case "rss":
      return fetchRSSFeed(config, maxItems);
    case "youtube":
      return fetchYouTubeFeed(config, maxItems);
    case "telegram":
      // TODO: Implement Telegram public channel scraping
      console.warn(`Telegram scraping not yet implemented for ${config.id}`);
      return [];
    default:
      console.warn(`Unknown feed type for ${config.id}`);
      return [];
  }
}

/**
 * Fetch items from ALL active feed sources.
 * Returns a flat array of all scraped items.
 */
export async function fetchAllFeeds(
  maxItemsPerFeed = 20
): Promise<ScrapedFeedItem[]> {
  const activeSources = FEED_SOURCES.filter((s) => s.isActive);
  const allItems: ScrapedFeedItem[] = [];

  for (const source of activeSources) {
    try {
      const items = await fetchFeedItems(source, maxItemsPerFeed);
      allItems.push(...items);
    } catch (err) {
      console.error(
        `Error fetching feed ${source.id}:`,
        err instanceof Error ? err.message : err
      );
    }

    // Be nice: 1 second delay between feeds
    await new Promise((r) => setTimeout(r, 1000));
  }

  return allItems;
}
