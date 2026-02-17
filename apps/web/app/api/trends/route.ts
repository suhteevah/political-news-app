import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/get-user-plan";

// GET: Trend snapshot data for Intelligence dashboard
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(user.id);
  if (plan !== "intelligence") {
    return NextResponse.json(
      { error: "Intelligence subscription required" },
      { status: 403 }
    );
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("category, x_author_handle, source")
    .gte("created_at", yesterday);

  const allPosts = posts || [];

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const p of allPosts) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  }
  const categories = Object.entries(catCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Top sources
  const srcCounts: Record<string, number> = {};
  for (const p of allPosts) {
    const handle = p.x_author_handle || p.source || "unknown";
    srcCounts[handle] = (srcCounts[handle] || 0) + 1;
  }
  const topSources = Object.entries(srcCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalPosts: allPosts.length,
    categories,
    topSources,
  });
}
