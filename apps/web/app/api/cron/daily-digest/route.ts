import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, buildDigestHtml } from "@/lib/email";

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

  // Get today's top posts (last 24 hours, max 15)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("content, x_author_name, x_author_handle, category, created_at, external_url, source")
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false })
    .limit(15);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ message: "No posts in last 24h, skipping digest" });
  }

  // Get all active Pro/Intelligence subscribers with daily digest enabled
  const { data: subscribers } = await supabase
    .from("subscriptions")
    .select(`
      user_id,
      plan,
      status
    `)
    .in("status", ["active", "trialing"])
    .in("plan", ["pro", "intelligence"]);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: "No active subscribers, skipping digest" });
  }

  // Get user emails and check their digest preferences
  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscribers) {
    try {
      // Check if user wants daily digest
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("daily_digest")
        .eq("user_id", sub.user_id)
        .single();

      // Default: send digest (unless explicitly opted out)
      if (prefs && prefs.daily_digest === false) {
        continue;
      }

      // Get user email from auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);

      if (!userData?.user?.email) continue;

      const html = buildDigestHtml(posts);

      await sendEmail({
        to: userData.user.email,
        subject: `🇺🇸 The Right Wire — Daily Digest (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
        html,
      });

      sent++;

      // Rate limit: 500ms between emails
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = `Failed to send digest to ${sub.user_id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // Track analytics
  await supabase.from("analytics_events").insert({
    event_type: "daily_digest_sent",
    metadata: { sent, total_subscribers: subscribers.length, post_count: posts.length },
  });

  return NextResponse.json({
    message: `Daily digest sent to ${sent}/${subscribers.length} subscribers`,
    posts_included: posts.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
