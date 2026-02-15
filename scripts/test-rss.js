/**
 * Test RSS/YouTube feed scraping standalone.
 * Usage: node scripts/test-rss.js
 */

const https = require("https");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": BROWSER_UA } }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      })
      .on("error", reject);
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
  return match ? match[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const match = xml.match(re);
  return match ? match[1] : "";
}

function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

async function testBuzzsprout() {
  console.log("=== Testing Buzzsprout RSS (S2 Underground Podcast) ===\n");
  const res = await httpGet("https://feeds.buzzsprout.com/868255.rss");
  console.log(`Status: ${res.status}`);
  console.log(`Body length: ${res.body.length} chars`);

  const items = res.body.split(/<item>/i).slice(1);
  console.log(`Total items: ${items.length}\n`);

  // Show first 3 items
  for (const item of items.slice(0, 3)) {
    const title = extractTag(item, "title");
    const pubDate = extractTag(item, "pubDate");
    const link = extractTag(item, "link");
    const desc = stripHtml(extractTag(item, "description")).substring(0, 200);
    const guid = extractTag(item, "guid");

    console.log(`Title: ${title}`);
    console.log(`Date: ${pubDate}`);
    console.log(`Link: ${link}`);
    console.log(`GUID: ${guid}`);
    console.log(`Desc: ${desc}...`);
    console.log("---");
  }
}

async function testYouTube() {
  console.log("\n=== Testing YouTube Atom Feed (S2 Underground Channel) ===\n");
  const res = await httpGet(
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCTq1zHztiV69Ur8t6jco4CQ"
  );
  console.log(`Status: ${res.status}`);
  console.log(`Body length: ${res.body.length} chars`);

  const entries = res.body.split(/<entry>/i).slice(1);
  console.log(`Total entries: ${entries.length}\n`);

  for (const entry of entries.slice(0, 3)) {
    const videoId = extractTag(entry, "yt:videoId");
    const title = extractTag(entry, "title");
    const published = extractTag(entry, "published");
    const desc = stripHtml(extractTag(entry, "media:description")).substring(0, 200);

    console.log(`VideoID: ${videoId}`);
    console.log(`Title: ${title}`);
    console.log(`Published: ${published}`);
    console.log(`URL: https://www.youtube.com/watch?v=${videoId}`);
    console.log(`Desc: ${desc}...`);
    console.log("---");
  }
}

async function main() {
  await testBuzzsprout();
  await testYouTube();
  console.log("\n=== All RSS tests complete ===");
}

main().catch(console.error);
