import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail, buildBreakingAlertHtml } from "@/lib/email";

const OWNER_USER_ID = "2dea127a-e812-41f1-9e83-95b12710b890";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST: Mark a post as breaking and send email alerts to Pro+ users
export async function POST(request: NextRequest) {
  // Auth: only the site owner can trigger breaking alerts
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { postId } = await request.json();

  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const admin = getAdminClient();

  // Get the post
  const { data: post, error: postError } = await admin
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check if alert was already sent for this post
  if (post.breaking_sent_at) {
    return NextResponse.json({
      error: "Breaking alert already sent for this post",
      sent_at: post.breaking_sent_at,
    }, { status: 409 });
  }

  // Mark the post as breaking
  await admin
    .from("posts")
    .update({ is_breaking: true, breaking_sent_at: new Date().toISOString() })
    .eq("id", postId);

  // Get all active Pro/Intelligence subscribers
  const { data: subscribers } = await admin
    .from("subscriptions")
    .select("user_id, plan, status")
    .in("status", ["active", "trialing"])
    .in("plan", ["pro", "intelligence"]);

  // Also include users with active referral Pro
  const { data: referralUsers } = await admin
    .from("profiles")
    .select("id, referral_pro_until")
    .gt("referral_pro_until", new Date().toISOString());

  // Build unique set of Pro+ user IDs
  const proUserIds = new Set<string>();
  subscribers?.forEach((s) => proUserIds.add(s.user_id));
  referralUsers?.forEach((u) => proUserIds.add(u.id));

  if (proUserIds.size === 0) {
    return NextResponse.json({
      message: "Post marked as breaking but no Pro subscribers to notify",
      sent: 0,
    });
  }

  // Build the email
  const html = buildBreakingAlertHtml(post);
  const subject = `🚨 BREAKING: ${post.x_author_name} — ${post.category || "Breaking News"}`;

  let sent = 0;
  const errors: string[] = [];

  for (const userId of proUserIds) {
    try {
      // Check user's alert preferences
      const { data: prefs } = await admin
        .from("email_preferences")
        .select("breaking_alerts, alert_categories")
        .eq("user_id", userId)
        .single();

      // Default: send alerts (unless explicitly opted out)
      if (prefs && prefs.breaking_alerts === false) {
        continue;
      }

      // Check if user wants alerts for this category
      if (prefs?.alert_categories && post.category) {
        const cats = prefs.alert_categories as string[];
        if (!cats.includes(post.category)) {
          continue;
        }
      }

      // Get user email
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      if (!userData?.user?.email) continue;

      await sendEmail({ to: userData.user.email, subject, html });
      sent++;

      // Rate limit: 500ms between emails
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = `Failed to send alert to ${userId}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // Track analytics
  await admin.from("analytics_events").insert({
    event_type: "breaking_alert_sent",
    user_id: user.id,
    metadata: {
      post_id: postId,
      category: post.category,
      recipients: proUserIds.size,
      sent,
    },
  });

  return NextResponse.json({
    message: `Breaking alert sent to ${sent}/${proUserIds.size} Pro subscribers`,
    post_id: postId,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// GET: List recent breaking alerts (for admin dashboard)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = getAdminClient();

  const { data: breakingPosts } = await admin
    .from("posts")
    .select("id, content, x_author_name, category, breaking_sent_at, created_at")
    .eq("is_breaking", true)
    .order("breaking_sent_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ alerts: breakingPosts || [] });
}
