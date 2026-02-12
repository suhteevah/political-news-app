import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdByUsername, getUserRecentTweets } from "@/lib/x-api";

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

  for (const source of sources) {
    // Get X user ID
    const userId = await getUserIdByUsername(source.x_handle);
    if (!userId) continue;

    // Get recent tweets
    const timeline = await getUserRecentTweets(userId, 5);
    if (!timeline.data) continue;

    const userMap = new Map(
      timeline.includes?.users?.map((u) => [u.id, u]) ?? []
    );
    const mediaMap = new Map(
      timeline.includes?.media?.map((m) => [m.media_key, m]) ?? []
    );

    for (const tweet of timeline.data) {
      const author = userMap.get(tweet.author_id);
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      const mediaUrls = mediaKeys
        .map((key) => {
          const m = mediaMap.get(key);
          return m?.url ?? m?.preview_image_url ?? null;
        })
        .filter(Boolean) as string[];

      // Upsert to avoid duplicates
      const { error } = await supabase.from("posts").upsert(
        {
          source: "x",
          x_tweet_id: tweet.id,
          x_author_handle: author?.username ?? source.x_handle,
          x_author_name: author?.name ?? source.display_name,
          x_author_avatar: author?.profile_image_url ?? null,
          content: tweet.text,
          media_urls: mediaUrls,
          category: source.category,
          created_at: tweet.created_at,
        },
        { onConflict: "x_tweet_id" }
      );

      if (!error) totalInserted++;
    }
  }

  return NextResponse.json({
    message: `Fetched posts from ${sources.length} sources`,
    inserted: totalInserted,
  });
}
