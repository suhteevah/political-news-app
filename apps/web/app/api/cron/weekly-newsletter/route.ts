import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, buildWeeklyDigestHtml } from "@/lib/email";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Get this week's top posts (last 7 days, max 10)
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("content, x_author_name, x_author_handle, category, created_at, external_url, source")
    .gte("created_at", lastWeek)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ message: "No posts this week, skipping newsletter" });
  }

  // Get all active newsletter subscribers
  const { data: subscribers } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("is_active", true);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: "No active newsletter subscribers" });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscribers) {
    try {
      const html = buildWeeklyDigestHtml(posts);

      await sendEmail({
        to: sub.email,
        subject: `🇺🇸 The Wire Report — Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        html,
      });

      sent++;

      // Rate limit: 500ms between emails (Gmail limits)
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = `Failed to send newsletter to ${sub.email}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // Track analytics
  await supabase.from("analytics_events").insert({
    event_type: "weekly_newsletter_sent",
    metadata: { sent, total_subscribers: subscribers.length, post_count: posts.length },
  });

  return NextResponse.json({
    message: `Weekly newsletter sent to ${sent}/${subscribers.length} subscribers`,
    posts_included: posts.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
