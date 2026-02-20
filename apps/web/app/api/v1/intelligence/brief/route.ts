import { NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";
import { getUserPlan } from "@/lib/get-user-plan";

export async function GET() {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const plan = await getUserPlan(user.id);
    if (plan !== "intelligence") {
      return NextResponse.json(
        { error: "Wire Intelligence subscription required" },
        { status: 403 }
      );
    }

    const supabase = await createMobileClient();

    // Fetch top 20 posts from the last 24 hours
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        "id, content, category, upvote_count, comment_count, source, created_at"
      )
      .gte("created_at", since.toISOString())
      .order("upvote_count", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching posts for brief:", error.message);
      return NextResponse.json(
        { error: "Failed to generate brief" },
        { status: 500 }
      );
    }

    const stories = posts ?? [];

    // Group by category for summary
    const categories: Record<string, number> = {};
    for (const post of stories) {
      const cat = post.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + 1;
    }

    return NextResponse.json({
      brief: {
        generated_at: new Date().toISOString(),
        summary: {
          total_stories: stories.length,
          categories,
        },
        top_stories: stories.map((post) => ({
          id: post.id,
          content: post.content,
          category: post.category,
          upvote_count: post.upvote_count,
          comment_count: post.comment_count,
          source: post.source,
          created_at: post.created_at,
        })),
      },
    });
  } catch (err) {
    console.error(
      "Unexpected error in GET /api/v1/intelligence/brief:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
