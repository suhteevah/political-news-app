import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRecentTweetsForHandle } from "@/lib/scraper";

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

  // Get all active curated sources
  const { data: sources } = await supabase
    .from("curated_sources")
    .select("*")
    .eq("is_active", true);

  if (!sources || sources.length === 0) {
    return NextResponse.json({ message: "No active sources" });
  }

  let totalInserted = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const tweets = await fetchRecentTweetsForHandle(source.x_handle, 5);

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

  return NextResponse.json({
    message: `Processed ${sources.length} sources`,
    inserted: totalInserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
