import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateHotTake,
  getWireConfig,
  isWireEnabled,
} from "@/lib/wire-ai";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Check global WIRE kill switch
  const enabled = await isWireEnabled(supabase);
  if (!enabled) {
    return NextResponse.json({ message: "WIRE AI is disabled" });
  }

  // Read config values with defaults
  const upvoteThreshold =
    (await getWireConfig(supabase, "hot_take_upvote_threshold")) ?? 20;
  const commentThreshold =
    (await getWireConfig(supabase, "hot_take_comment_threshold")) ?? 15;
  const windowMinutes =
    (await getWireConfig(supabase, "hot_take_window_minutes")) ?? 60;
  const maxHotTakesPerDay =
    (await getWireConfig(supabase, "max_hot_takes_per_day")) ?? 8;
  const model = await getWireConfig(supabase, "commentator_model");

  const wireUserId = process.env.WIRE_USER_ID!;

  // Count today's WIRE hot take comments to enforce daily cap
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count: todayCount, error: countError } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", wireUserId)
    .gte("created_at", startOfToday.toISOString());

  if (countError) {
    console.error("Failed to count today's WIRE comments:", countError.message);
    return NextResponse.json(
      { error: "Failed to count daily comments", details: countError.message },
      { status: 500 }
    );
  }

  const commentsToday = todayCount ?? 0;
  if (commentsToday >= maxHotTakesPerDay) {
    return NextResponse.json({
      message: `Daily hot take cap reached (${commentsToday}/${maxHotTakesPerDay})`,
      comments_posted: 0,
    });
  }

  // Calculate time window
  const windowStart = new Date(
    Date.now() - windowMinutes * 60 * 1000
  ).toISOString();

  // Query posts that meet EITHER engagement threshold within the window
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, category, upvote_count, comment_count")
    .gte("created_at", windowStart)
    .or(
      `upvote_count.gte.${upvoteThreshold},comment_count.gte.${commentThreshold}`
    )
    .order("upvote_count", { ascending: false });

  if (postsError) {
    console.error("Failed to fetch trending posts:", postsError.message);
    return NextResponse.json(
      { error: "Failed to fetch posts", details: postsError.message },
      { status: 500 }
    );
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({
      message: "No posts met engagement thresholds",
      comments_posted: 0,
    });
  }

  let commentsPosted = 0;
  const remainingCap = maxHotTakesPerDay - commentsToday;
  const maxNewComments = Math.min(3, remainingCap);

  for (const post of posts) {
    if (commentsPosted >= maxNewComments) break;

    // Check if WIRE has already commented on this post
    const { count: existingCount } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id)
      .eq("user_id", wireUserId);

    if ((existingCount ?? 0) > 0) continue;

    // Generate and insert hot take comment
    try {
      const hotTake = await generateHotTake(
        post.content.slice(0, 100),
        post.category,
        {
          upvote_count: post.upvote_count,
          comment_count: post.comment_count,
          time_window: `${windowMinutes} minutes`,
        },
        model ?? undefined
      );

      const { error: commentError } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: wireUserId,
        content: hotTake,
      });

      if (commentError) {
        console.error(
          `Failed to insert hot take for post ${post.id}:`,
          commentError.message
        );
        continue;
      }

      // Track analytics event
      await supabase.from("analytics_events").insert({
        event_type: "wire_hot_take",
        metadata: {
          post_id: post.id,
          upvote_count: post.upvote_count,
          comment_count: post.comment_count,
        },
      });

      commentsPosted++;
    } catch (err) {
      console.error(
        `Failed to generate hot take for post ${post.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return NextResponse.json({
    message: `WIRE posted ${commentsPosted} hot take comment(s)`,
    comments_posted: commentsPosted,
  });
}
