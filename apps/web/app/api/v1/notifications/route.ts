import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

export async function GET(request: NextRequest) {
  try {
    const supabase = createMobileClient(request);
    const user = await getMobileUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );
    const unreadOnly = searchParams.get("unread_only") === "true";

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (unreadError) {
      console.error("Error counting unread notifications:", unreadError);
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      unread_count: unreadCount || 0,
    });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createMobileClient(request);
    const user = await getMobileUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, mark_all_read } = body;

    if (mark_all_read === true) {
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .select("id");

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return NextResponse.json(
          { error: "Failed to mark notifications as read" },
          { status: 500 }
        );
      }

      return NextResponse.json({ updated: data?.length || 0 });
    }

    if (
      !Array.isArray(notification_ids) ||
      notification_ids.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "notification_ids must be a non-empty array, or set mark_all_read to true",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("id", notification_ids)
      .select("id");

    if (error) {
      console.error("Error marking notifications as read:", error);
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ updated: data?.length || 0 });
  } catch (err) {
    console.error("Notifications POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
