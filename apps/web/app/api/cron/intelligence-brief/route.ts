import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  IntelligenceBriefPDF,
  extractTrendingTopics,
} from "@/lib/intelligence-brief";

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

  // Get posts from last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: allPosts } = await supabase
    .from("posts")
    .select(
      "id, content, x_author_name, x_author_handle, category, created_at, external_url, source, is_breaking, upvote_count, comment_count"
    )
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false });

  const posts = allPosts || [];

  if (posts.length === 0) {
    return NextResponse.json({
      message: "No posts in last 24h, skipping intelligence brief",
    });
  }

  // Get active source count
  const { count: sourceCount } = await supabase
    .from("curated_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Build brief data
  const topPosts = [...posts]
    .sort(
      (a, b) =>
        b.upvote_count + b.comment_count - (a.upvote_count + a.comment_count)
    )
    .slice(0, 20);

  const breakingPosts = posts.filter((p) => p.is_breaking);

  const catCounts: Record<string, number> = {};
  for (const p of posts) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  }
  const categoryBreakdown = Object.entries(catCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const topCategory =
    categoryBreakdown.length > 0 ? categoryBreakdown[0].category : "N/A";

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

  // Generate PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(IntelligenceBriefPDF, { data: briefData }) as any
  );

  // Get all Intelligence subscribers
  const { data: subscribers } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("plan", "intelligence")
    .in("status", ["active", "trialing"]);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({
      message: "No Intelligence subscribers, skipping brief email",
    });
  }

  let sent = 0;
  const errors: string[] = [];
  const shortDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  for (const sub of subscribers) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(
        sub.user_id
      );
      if (!userData?.user?.email) continue;

      const html = buildIntelligenceBriefEmailHtml(
        posts.length,
        topCategory,
        breakingPosts.length,
        trendingTopics.slice(0, 5)
      );

      await sendEmail({
        to: userData.user.email,
        subject: `📊 Intelligence Brief — ${shortDate}`,
        html,
        attachments: [
          {
            filename: `intelligence-brief-${new Date().toISOString().slice(0, 10)}.pdf`,
            content: Buffer.from(pdfBuffer),
            contentType: "application/pdf",
          },
        ],
      });

      sent++;
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = `Failed to send brief to ${sub.user_id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // Track analytics
  await supabase.from("analytics_events").insert({
    event_type: "intelligence_brief_emailed",
    metadata: {
      sent,
      total_subscribers: subscribers.length,
      post_count: posts.length,
    },
  });

  return NextResponse.json({
    message: `Intelligence Brief emailed to ${sent}/${subscribers.length} subscribers`,
    posts_included: posts.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function buildIntelligenceBriefEmailHtml(
  postCount: number,
  topCategory: string,
  breakingCount: number,
  trendingTopics: { topic: string; mentions: number }[]
) {
  const topicsHtml = trendingTopics
    .map(
      (t) =>
        `<span style="display:inline-block;padding:4px 12px;background:#1a1a1a;border-radius:12px;margin:2px 4px;font-size:13px;color:#e5e5e5;">${t.topic} (${t.mentions})</span>`
    )
    .join("");

  return `
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:32px;border-radius:12px;">
      <div style="border-bottom:2px solid #dc2626;padding-bottom:16px;margin-bottom:24px;">
        <h1 style="margin:0;font-size:22px;color:#dc2626;">📊 Intelligence Brief</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#888;">The Right Wire — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <p style="color:#ccc;font-size:14px;line-height:1.6;">
        Your daily Intelligence Brief is attached as a PDF. Here's a quick snapshot:
      </p>

      <div style="display:flex;gap:12px;margin:20px 0;">
        <div style="flex:1;background:#111;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#dc2626;">${postCount}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Stories Tracked</div>
        </div>
        <div style="flex:1;background:#111;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#dc2626;">${breakingCount}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Breaking Alerts</div>
        </div>
        <div style="flex:1;background:#111;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:16px;font-weight:bold;color:#dc2626;">${topCategory}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Top Category</div>
        </div>
      </div>

      ${trendingTopics.length > 0 ? `
      <h3 style="color:#fff;font-size:14px;margin:24px 0 8px;">Trending Topics</h3>
      <div style="margin-bottom:24px;">${topicsHtml}</div>
      ` : ""}

      <div style="text-align:center;margin:24px 0;">
        <a href="https://the-right-wire.com/dashboard" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Open Dashboard</a>
      </div>

      <div style="border-top:1px solid #222;padding-top:16px;margin-top:24px;">
        <p style="font-size:11px;color:#666;text-align:center;">
          Wire Intelligence — <a href="https://the-right-wire.com/profile" style="color:#dc2626;">Manage preferences</a>
        </p>
      </div>
    </div>
  `;
}
