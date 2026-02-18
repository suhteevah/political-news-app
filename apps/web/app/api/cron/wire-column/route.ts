import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateWeeklyColumn,
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

  // Check column-specific toggle
  const columnEnabled = await getWireConfig(supabase, "column_enabled");
  if (columnEnabled === false) {
    return NextResponse.json({ message: "WIRE weekly column is disabled" });
  }

  // Query top 20 posts from the last 7 days
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, category, upvote_count, comment_count")
    .gte("created_at", sevenDaysAgo)
    .order("upvote_count", { ascending: false })
    .limit(20);

  if (postsError) {
    console.error("Failed to fetch posts for weekly column:", postsError.message);
    return NextResponse.json(
      { error: "Failed to fetch posts", details: postsError.message },
      { status: 500 }
    );
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({
      message: "No posts found in the last 7 days for weekly column",
    });
  }

  // Map to PostSummary format
  const summaries: PostSummary[] = posts.map((post) => ({
    title: post.content.slice(0, 100),
    category: post.category,
    upvote_count: post.upvote_count,
    comment_count: post.comment_count,
  }));

  // Build category breakdown
  const categoryMap: Record<string, number> = {};
  for (const post of posts) {
    categoryMap[post.category] = (categoryMap[post.category] || 0) + 1;
  }
  const categoryBreakdown = Object.entries(categoryMap).map(
    ([name, count]) => ({ name, count })
  );

  // Get model preference (column uses Sonnet for quality)
  const factsModel = await getWireConfig(supabase, "facts_model");

  // Generate the weekly column
  const generatedColumn = await generateWeeklyColumn(
    summaries,
    categoryBreakdown,
    factsModel ?? undefined
  );

  // Insert into wire_columns table with pending status for admin review
  const { error: columnError } = await supabase.from("wire_columns").insert({
    title: "WIRE's Week in Review",
    content: generatedColumn,
    status: "pending",
    model: factsModel,
  });

  if (columnError) {
    console.error("Failed to insert wire column:", columnError.message);
    return NextResponse.json(
      { error: "Failed to insert column", details: columnError.message },
      { status: 500 }
    );
  }

  // Track analytics event
  await supabase.from("analytics_events").insert({
    event_type: "wire_column_generated",
    metadata: { post_count: posts.length },
  });

  return NextResponse.json({
    message: "WIRE weekly column generated and pending review",
    post_count: posts.length,
  });
}
