import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRecentTweetsForHandle } from "@/lib/scraper";
import { fetchAllFeeds } from "@/lib/rss-scraper";

// Use service role key for server-side operations
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Simple auth: check for a secret header (use cron service secret)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  let totalInserted = 0;
  const errors: string[] = [];

  // ── Phase 1: Scrape X/Twitter curated sources ──────────────

  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .eq("is_active", true);

  if (sources && sources.length > 0) {
    for (const source of sources) {
      try {
        const tweets = await fetchRecentTweetsForHandle(source.x_handle, 10);

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

          if (!error) totalInserted++;
        }
      } catch (err) {
        const msg = `Failed to fetch @${source.x_handle}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
      }

      // Be nice: 2 second delay between sources
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // ── Phase 2: Scrape RSS / YouTube feeds ────────────────────

  try {
    const feedItems = await fetchAllFeeds(20);

    for (const item of feedItems) {
      const { error } = await supabase.from("posts").upsert(
        {
          source: item.source,
          source_id: item.sourceId,
          x_author_handle: item.authorHandle,
          x_author_name: item.authorName,
          x_author_avatar: item.authorAvatar,
          content: item.content,
          external_url: item.externalUrl,
          media_urls: item.mediaUrls,
          category: item.category,
          created_at: item.createdAt,
        },
        { onConflict: "source_id" }
      );

      if (!error) totalInserted++;
      else {
        console.warn(`RSS upsert error for ${item.sourceId}: ${error.message}`);
      }
    }
  } catch (err) {
    const msg = `Failed to fetch RSS/YouTube feeds: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  return NextResponse.json({
    message: `Processed ${sources?.length ?? 0} X sources + RSS/YouTube feeds`,
    inserted: totalInserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
