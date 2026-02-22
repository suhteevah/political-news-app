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
  let totalUpserted = 0;
  let totalNewPosts = 0;
  let totalTweetsFetched = 0;
  const errors: string[] = [];
  const sourceStats: Array<{
    handle: string;
    tweets: number;
    newest?: string;
    oldest?: string;
  }> = [];

  // ── Phase 1: Scrape X/Twitter curated sources ──────────────

  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .eq("is_active", true);

  if (sources && sources.length > 0) {
    for (const source of sources) {
      try {
        const tweets = await fetchRecentTweetsForHandle(source.x_handle, 10);
        totalTweetsFetched += tweets.length;

        const stat: (typeof sourceStats)[0] = {
          handle: source.x_handle,
          tweets: tweets.length,
        };

        if (tweets.length > 0) {
          // Sort by date to find newest/oldest
          const sorted = [...tweets].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );
          stat.newest = sorted[0].createdAt;
          stat.oldest = sorted[sorted.length - 1].createdAt;
        }

        sourceStats.push(stat);

        for (const tweet of tweets) {
          // Check if this tweet already exists
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
          }
        }
      } catch (err) {
        const msg = `Failed to fetch @${source.x_handle}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
        sourceStats.push({ handle: source.x_handle, tweets: 0 });
      }

      // Be nice: 2 second delay between sources
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // ── Phase 2: Scrape RSS / YouTube feeds ────────────────────

  let rssCount = 0;
  let rssNew = 0;

  try {
    const feedItems = await fetchAllFeeds(20);
    rssCount = feedItems.length;

    for (const item of feedItems) {
      // Check if this item already exists
      const { data: existing } = await supabase
        .from("posts")
        .select("id")
        .eq("source_id", item.sourceId)
        .maybeSingle();

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

      if (!error) {
        totalUpserted++;
        if (!existing) {
          totalNewPosts++;
          rssNew++;
        }
      } else {
        console.warn(
          `RSS upsert error for ${item.sourceId}: ${error.message}`
        );
      }
    }
  } catch (err) {
    const msg = `Failed to fetch RSS/YouTube feeds: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  // ── Build diagnostic summary ─────────────────────────────────

  // Find how stale the X data is
  const newestTweetDates = sourceStats
    .filter((s) => s.newest)
    .map((s) => new Date(s.newest!).getTime());
  const newestTweetTime =
    newestTweetDates.length > 0 ? Math.max(...newestTweetDates) : null;
  const staleMinutes = newestTweetTime
    ? Math.round((Date.now() - newestTweetTime) / 60000)
    : null;

  const emptySources = sourceStats.filter((s) => s.tweets === 0);

  return NextResponse.json({
    message: `Processed ${sources?.length ?? 0} X sources + RSS/YouTube feeds`,
    x: {
      sources: sources?.length ?? 0,
      tweetsFetched: totalTweetsFetched,
      newPosts: totalNewPosts - rssNew,
      staleMinutes,
      newestTweet: newestTweetTime
        ? new Date(newestTweetTime).toISOString()
        : null,
      emptySources: emptySources.length > 0
        ? emptySources.map((s) => s.handle)
        : undefined,
    },
    rss: {
      itemsFetched: rssCount,
      newPosts: rssNew,
    },
    totals: {
      upserted: totalUpserted,
      newPosts: totalNewPosts,
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}
