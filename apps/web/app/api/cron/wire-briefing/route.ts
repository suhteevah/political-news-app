import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateBriefing,
  getWireConfig,
  isWireEnabled,
  type PostSummary,
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

  // Check briefing-specific toggle
  const briefingEnabled = await getWireConfig(supabase, "briefing_enabled");
  if (briefingEnabled === false) {
    return NextResponse.json({ message: "WIRE briefings are disabled" });
  }

  // Determine briefing type from query param
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") === "evening" ? "evening" : "morning") as
    | "morning"
    | "evening";

  // Get model preference from config
  const model = await getWireConfig(supabase, "commentator_model");

  // Query recent posts
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const postLimit = type === "morning" ? 5 : 3;

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, category, upvote_count, comment_count")
    .gte("created_at", twelveHoursAgo)
    .order("upvote_count", { ascending: false })
    .limit(postLimit);

  if (postsError) {
    console.error("Failed to fetch posts for briefing:", postsError.message);
    return NextResponse.json(
      { error: "Failed to fetch posts", details: postsError.message },
      { status: 500 }
    );
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({
      message: `No posts found in the last 12 hours for ${type} briefing`,
    });
  }

  // Map to PostSummary format
  const summaries: PostSummary[] = posts.map((post) => ({
    title: post.content.slice(0, 100),
    category: post.category,
    upvote_count: post.upvote_count,
    comment_count: post.comment_count,
  }));

  // Generate briefing content
  const generatedText = await generateBriefing(type, summaries, model ?? undefined);

  // Insert as a WIRE post
  const { error: insertError } = await supabase.from("posts").insert({
    source: "wire",
    user_id: process.env.WIRE_USER_ID,
    x_author_name: "WIRE",
    x_author_handle: "wire",
    content: generatedText,
    category: "Analysis",
    media_urls: [],
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Failed to insert WIRE briefing post:", insertError.message);
    return NextResponse.json(
      { error: "Failed to insert briefing post", details: insertError.message },
      { status: 500 }
    );
  }

  // Track analytics event
  await supabase.from("analytics_events").insert({
    event_type: "wire_briefing_posted",
    metadata: { type, post_count: posts.length },
  });

  return NextResponse.json({
    message: `WIRE ${type} briefing posted successfully`,
    post_count: posts.length,
  });
}
