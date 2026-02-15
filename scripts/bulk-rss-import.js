/**
 * Bulk RSS/YouTube import — fetches ALL available items from configured feeds
 * and inserts them into Supabase.
 *
 * Usage: node scripts/bulk-rss-import.js
 */

const https = require("https");
const http = require("http");

// --- Config (loaded from environment) ---
require("dotenv").config({ path: require("path").resolve(__dirname, "../apps/web/.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const S2_AVATAR = "https://storage.buzzsprout.com/mev3iqgng895zb411h62t1wv75fa?.jpg";

// --- Helpers ---

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod
      .get(url, { headers: { "User-Agent": BROWSER_UA } }, (res) => {
        // Follow redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          return httpGet(res.headers.location).then(resolve).catch(reject);
        }
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      })
      .on("error", reject);
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers,
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function extractTag(xml, tag) {
  const cdataRe = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  return match
    ? match[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    : "";
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const match = xml.match(re);
  return match ? match[1] : "";
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(text, max = 500) {
  if (text.length <= max) return text;
  const t = text.substring(0, max);
  const s = t.lastIndexOf(" ");
  return (s > max * 0.7 ? t.substring(0, s) : t) + "...";
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Buzzsprout RSS ---

async function fetchBuzzsprout() {
  console.log("\n--- Fetching Buzzsprout RSS (S2 Underground Podcast) ---");
  const res = await httpGet("https://rss.buzzsprout.com/868255.rss");

  if (res.status !== 200) {
    console.warn(`Buzzsprout returned ${res.status}`);
    return [];
  }

  const items = res.body.split(/<item>/i).slice(1);
  console.log(`Found ${items.length} podcast episodes`);

  const results = [];

  for (const item of items) {
    const title = extractTag(item, "title");
    const description = extractTag(item, "description");
    const summary = extractTag(item, "itunes:summary");
    const link = extractTag(item, "link");
    const guid = extractTag(item, "guid") || link;
    const pubDate = extractTag(item, "pubDate");
    const episodeImage = extractAttr(item, "itunes:image", "href");

    const rawContent = summary || description || "";
    const cleanContent = stripHtml(rawContent);
    const displayContent = title
      ? `${title}\n\n${truncate(cleanContent, 800)}`
      : truncate(cleanContent, 800);

    if (!displayContent.trim()) continue;

    const mediaUrls = [];
    if (episodeImage) mediaUrls.push(episodeImage);

    results.push({
      source_id: guid,
      source: "rss",
      x_author_handle: "s2-underground-podcast",
      x_author_name: "S2 Underground",
      x_author_avatar: S2_AVATAR,
      content: displayContent,
      external_url: link,
      media_urls: mediaUrls,
      category: "World",
      created_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }

  return results;
}

// --- YouTube Atom ---

async function fetchYouTube() {
  console.log("\n--- Fetching YouTube Atom Feed (S2 Underground Channel) ---");
  const res = await httpGet(
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCTq1zHztiV69Ur8t6jco4CQ"
  );

  if (res.status !== 200) {
    console.warn(`YouTube returned ${res.status}`);
    return [];
  }

  const entries = res.body.split(/<entry>/i).slice(1);
  console.log(`Found ${entries.length} videos`);

  const results = [];

  for (const entry of entries) {
    const videoId = extractTag(entry, "yt:videoId");
    const title = extractTag(entry, "title");
    const published = extractTag(entry, "published");
    const description = extractTag(entry, "media:description");
    const thumbnailUrl = extractAttr(entry, "media:thumbnail", "url");

    if (!videoId || !title) continue;

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const mediaUrls = [
      thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ];

    const displayContent = description
      ? `${title}\n\n${truncate(stripHtml(description), 400)}`
      : title;

    results.push({
      source_id: `yt-${videoId}`,
      source: "youtube",
      x_author_handle: "s2-underground-youtube",
      x_author_name: "S2 Underground",
      x_author_avatar: S2_AVATAR,
      content: displayContent,
      external_url: videoUrl,
      media_urls: mediaUrls,
      category: "World",
      created_at: published || new Date().toISOString(),
    });
  }

  return results;
}

// --- Supabase upsert ---

async function upsertPosts(posts) {
  const batchSize = 20;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    const res = await httpPost(
      `${SUPABASE_URL}/rest/v1/posts`,
      batch,
      {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "resolution=merge-duplicates,return=representation",
      }
    );

    if (res.status >= 200 && res.status < 300) {
      try {
        const result = JSON.parse(res.body);
        inserted += Array.isArray(result) ? result.length : batch.length;
      } catch {
        inserted += batch.length;
      }
    } else {
      console.warn(`Batch insert failed (${res.status}): ${res.body.substring(0, 300)}`);
      failed += batch.length;
    }
  }

  return { inserted, failed };
}

// --- Main ---

async function main() {
  console.log("=== Bulk RSS/YouTube Import ===\n");

  const buzzsproutItems = await fetchBuzzsprout();
  await delay(1000);
  const youtubeItems = await fetchYouTube();

  const allItems = [...buzzsproutItems, ...youtubeItems];
  console.log(`\nTotal items to upsert: ${allItems.length}`);

  if (allItems.length === 0) {
    console.log("No items found, exiting.");
    return;
  }

  const { inserted, failed } = await upsertPosts(allItems);
  console.log(`\n=== DONE: ${inserted} upserted, ${failed} failed ===`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
