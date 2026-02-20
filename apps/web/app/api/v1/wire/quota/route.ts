import { NextResponse } from "next/server";
import { getMobileUser, getAdminClient } from "@/lib/supabase/mobile";
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
    const admin = getAdminClient();

    // Determine the config key for this plan's daily limit
    const limitKey =
      plan === "intelligence"
        ? "daily_ask_limit_intelligence"
        : plan === "pro"
          ? "daily_ask_limit_pro"
          : "daily_ask_limit_free";

    // Fetch the daily limit from wire_config
    const { data: configRow, error: configError } = await admin
      .from("wire_config")
      .select("value")
      .eq("key", limitKey)
      .single();

    if (configError) {
      console.error("Error fetching wire config:", configError.message);
    }

    // Default limits: free=3, pro=10, intelligence=25
    const defaultLimits: Record<string, number> = {
      daily_ask_limit_free: 3,
      daily_ask_limit_pro: 10,
      daily_ask_limit_intelligence: 25,
    };

    const limit = configRow?.value ?? defaultLimits[limitKey] ?? 3;

    // Count today's interactions for this user
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: used, error: countError } = await admin
      .from("wire_interactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    if (countError) {
      console.error(
        "Error counting wire interactions:",
        countError.message
      );
      return NextResponse.json(
        { error: "Failed to check quota" },
        { status: 500 }
      );
    }

    const usedCount = used ?? 0;
    const remaining = Math.max(limit - usedCount, 0);

    return NextResponse.json({
      quota: {
        limit,
        used: usedCount,
        remaining,
        plan,
      },
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/wire/quota:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
