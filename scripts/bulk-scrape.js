/**
 * Bulk scrape script — fetches ALL available tweets from the Twitter Syndication API
 * for specified handles and inserts them into Supabase.
 *
 * Usage: node scripts/bulk-scrape.js [handle1] [handle2] ...
 *   If no handles specified, scrapes all active curated_sources.
 */

const https = require("https");

// --- Config (loaded from environment) ---
require("dotenv").config({ path: require("path").resolve(__dirname, "../apps/web/.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

const SYNDICATION_BASE =
  "https://syndication.twitter.com/srv/timeline-profile/screen-name";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// --- Helpers ---

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: { "User-Agent": BROWSER_UA, ...headers },
    };
    https
      .get(url, opts, (res) => {
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Syndication API ---

async function fetchAllTweetsFromSyndication(handle) {
  console.log(`\nFetching tweets for @${handle} via Syndication API...`);

  const res = await httpGet(`${SYNDICATION_BASE}/${handle}`);

  if (res.status !== 200) {
    console.warn(`  Syndication returned ${res.status} for @${handle}`);
    return [];
  }

  const match = res.body.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
  );
  if (!match) {
    console.warn(`  No __NEXT_DATA__ found for @${handle}`);
    return [];
  }

  const data = JSON.parse(match[1]);
  const entries = data.props?.pageProps?.timeline?.entries || [];

  // Filter to own tweets only
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

  console.log(
    `  Found ${entries.length} total entries, ${tweetEntries.length} own tweets`
  );

  const results = [];

  for (const entry of tweetEntries) {
    const tweet = entry.content?.tweet;
    if (!tweet) continue;

    const text = tweet.full_text || tweet.text || "";
    if (!text) continue;

    // Collect media URLs
    const mediaUrls = [];
    const allMedia = [
      ...(tweet.extended_entities?.media || []),
      ...(tweet.entities?.media || []),
    ];
    const seenMediaUrls = new Set();

    for (const m of allMedia) {
      const url = m.media_url_https || m.url || "";
      if (url && !seenMediaUrls.has(url)) {
        seenMediaUrls.add(url);
        mediaUrls.push(url);
      }
    }

    results.push({
      tweetId: tweet.id_str || entry.entry_id.replace("tweet-", ""),
      authorHandle: tweet.user?.screen_name || handle,
      authorName: tweet.user?.name || handle,
      authorAvatar: tweet.user?.profile_image_url_https
        ? tweet.user.profile_image_url_https.replace("_normal", "_400x400")
        : null,
      content: text.replace(/https:\/\/t\.co\/\w+$/g, "").trim(),
      mediaUrls,
      createdAt: tweet.created_at
        ? new Date(tweet.created_at).toISOString()
        : new Date().toISOString(),
    });
  }

  return results;
}

// --- Supabase insert ---

async function upsertTweets(tweets, category) {
  // Batch insert in groups of 20
  const batchSize = 20;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < tweets.length; i += batchSize) {
    const batch = tweets.slice(i, i + batchSize).map((t) => ({
      source: "x",
      x_tweet_id: t.tweetId,
      x_author_handle: t.authorHandle,
      x_author_name: t.authorName,
      x_author_avatar: t.authorAvatar,
      content: t.content,
      media_urls: t.mediaUrls,
      category: category,
      created_at: t.createdAt,
    }));

    const res = await httpPost(
      `${SUPABASE_URL}/rest/v1/posts?on_conflict=x_tweet_id`,
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
        inserted += Array.isArray(result) ? result.length : 0;
      } catch {
        inserted += batch.length;
      }
    } else {
      console.warn(
        `  Batch insert failed (status ${res.status}): ${res.body.substring(0, 200)}`
      );
      skipped += batch.length;
    }
  }

  return { inserted, skipped };
}

// --- Get curated sources ---

async function getCuratedSources() {
  const res = await httpGet(
    `${SUPABASE_URL}/rest/v1/curated_sources?is_active=eq.true&select=x_handle,category`,
    {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }
  );

  if (res.status !== 200) {
    console.error("Failed to fetch curated sources:", res.body);
    return [];
  }

  return JSON.parse(res.body);
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  let handles;
  let sourceMap = {}; // handle -> category

  if (args.length > 0) {
    // Use specified handles
    handles = args;
    // Look up categories from curated_sources
    const sources = await getCuratedSources();
    for (const s of sources) {
      sourceMap[s.x_handle.toLowerCase()] = s.category;
    }
    // Default to "Politics" if not found
    for (const h of handles) {
      if (!sourceMap[h.toLowerCase()]) {
        sourceMap[h.toLowerCase()] = "Politics";
      }
    }
  } else {
    // Scrape all active curated sources
    const sources = await getCuratedSources();
    handles = sources.map((s) => s.x_handle);
    for (const s of sources) {
      sourceMap[s.x_handle.toLowerCase()] = s.category;
    }
  }

  console.log(`=== Bulk Scrape: ${handles.length} handles ===`);
  console.log(`Handles: ${handles.join(", ")}\n`);

  let grandTotal = 0;

  for (const handle of handles) {
    const tweets = await fetchAllTweetsFromSyndication(handle);

    if (tweets.length === 0) {
      console.log(`  No tweets found for @${handle}, skipping.`);
      continue;
    }

    const category = sourceMap[handle.toLowerCase()] || "Politics";
    const { inserted, skipped } = await upsertTweets(tweets, category);

    console.log(
      `  @${handle}: ${inserted} upserted, ${skipped} skipped/failed`
    );
    grandTotal += inserted;

    // 2s delay between handles
    if (handles.indexOf(handle) < handles.length - 1) {
      await delay(2000);
    }
  }

  console.log(`\n=== DONE: ${grandTotal} total tweets upserted ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
