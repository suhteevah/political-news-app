import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getUserPlan } from "@/lib/get-user-plan";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  IntelligenceBriefPDF,
  extractTrendingTopics,
  type BriefData,
} from "@/lib/intelligence-brief";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Generate and download today's Intelligence Brief PDF
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const plan = await getUserPlan(user.id);

  if (plan !== "intelligence") {
    return NextResponse.json(
      { error: "Intelligence Brief requires Wire Intelligence subscription" },
      { status: 403 }
    );
  }

  const admin = getAdminClient();

  // Get posts from last 24 hours
  const yesterday = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: allPosts } = await admin
    .from("posts")
    .select(
      "id, content, x_author_name, x_author_handle, category, created_at, external_url, source, is_breaking, upvote_count, comment_count"
    )
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false });

  const posts = allPosts || [];

  // Get active source count
  const { count: sourceCount } = await admin
    .from("curated_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Top posts by engagement (votes + comments)
  const topPosts = [...posts]
    .sort(
      (a, b) =>
        b.upvote_count + b.comment_count - (a.upvote_count + a.comment_count)
    )
    .slice(0, 20);

  // Breaking posts
  const breakingPosts = posts.filter((p) => p.is_breaking);

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const p of posts) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  }
  const categoryBreakdown = Object.entries(catCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const topCategory =
    categoryBreakdown.length > 0 ? categoryBreakdown[0].category : "N/A";

  // Trending topics
  const trendingTopics = extractTrendingTopics(posts);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const briefData = {
    date: dateStr,
    topPosts,
    breakingPosts,
    stats: {
      totalPosts: posts.length,
      totalSources: sourceCount || 0,
      breakingCount: breakingPosts.length,
      topCategory,
    },
    categoryBreakdown,
    trendingTopics,
  };

  // Generate PDF — cast needed for React 19 + @react-pdf/renderer compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(IntelligenceBriefPDF, { data: briefData }) as any
  );

  // Track analytics
  await admin.from("analytics_events").insert({
    event_type: "intelligence_brief_downloaded",
    user_id: user.id,
    metadata: {
      post_count: posts.length,
      date: dateStr,
    },
  });

  // Return PDF as downloadable file
  const filename = `intelligence-brief-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
