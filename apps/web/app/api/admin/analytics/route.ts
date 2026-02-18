import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const OWNER_USER_ID = "2dea127a-e812-41f1-9e83-95b12710b890";

export async function GET() {
  // Verify admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service role to query analytics_events
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get event counts by type
  const { data: events } = await admin
    .from("analytics_events")
    .select("event_type, created_at");

  // Get total users
  const { count: totalUsers } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Get active subscribers
  const { data: subs } = await admin
    .from("subscriptions")
    .select("plan, status")
    .in("status", ["active", "trialing"]);

  // Get newsletter subscribers
  const { count: newsletterCount } = await admin
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Calculate stats
  const eventCounts: Record<string, number> = {};
  const last7Days: Record<string, number> = {};
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  (events || []).forEach((e: { event_type: string; created_at: string }) => {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    if (new Date(e.created_at) > sevenDaysAgo) {
      last7Days[e.event_type] = (last7Days[e.event_type] || 0) + 1;
    }
  });

  const proSubs = (subs || []).filter((s) => s.plan === "pro").length;
  const intelSubs = (subs || []).filter((s) => s.plan === "intelligence").length;

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    proSubscribers: proSubs,
    intelligenceSubscribers: intelSubs,
    newsletterSubscribers: newsletterCount || 0,
    eventCounts,
    last7Days,
  });
}
