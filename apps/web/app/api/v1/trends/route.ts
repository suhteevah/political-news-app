import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/supabase/mobile";
import { getAdminClient } from "@/lib/supabase/mobile";
import { getUserPlan } from "@/lib/get-user-plan";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = Math.min(Math.max(daysParam || 7, 1), 30);

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const admin = getAdminClient();

    // 1. Category breakdown
    const { data: posts, error: postsError } = await admin
      .from("posts")
      .select("category, created_at")
      .gte("created_at", sinceIso);

    if (postsError) {
      console.error("Error fetching posts for trends:", postsError.message);
      return NextResponse.json(
        { error: "Failed to fetch trend data" },
        { status: 500 }
      );
    }

    const allPosts = posts ?? [];

    // Category counts
    const categoryMap: Record<string, number> = {};
    for (const post of allPosts) {
      const cat = post.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const categories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Top sources by x_author_handle
    const { data: sourcePosts, error: sourceError } = await admin
      .from("posts")
      .select("x_author_handle")
      .gte("created_at", sinceIso)
      .not("x_author_handle", "is", null);

    if (sourceError) {
      console.error(
        "Error fetching source data for trends:",
        sourceError.message
      );
      return NextResponse.json(
        { error: "Failed to fetch trend data" },
        { status: 500 }
      );
    }

    const sourceMap: Record<string, number> = {};
    for (const post of sourcePosts ?? []) {
      if (post.x_author_handle) {
        const handle = post.x_author_handle;
        sourceMap[handle] = (sourceMap[handle] || 0) + 1;
      }
    }
    const top_sources = Object.entries(sourceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. Daily volume
    const volumeMap: Record<string, number> = {};
    for (const post of allPosts) {
      const date = post.created_at.split("T")[0]; // YYYY-MM-DD
      volumeMap[date] = (volumeMap[date] || 0) + 1;
    }
    const daily_volume = Object.entries(volumeMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      trends: {
        categories,
        top_sources,
        daily_volume,
        period_days: days,
      },
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/trends:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
