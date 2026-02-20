import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

export async function GET() {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createMobileClient();

    const { data: blocked, error: fetchError } = await supabase
      .from("blocked_users")
      .select(
        `
        id,
        blocked_id,
        created_at,
        profile:profiles!blocked_users_blocked_id_fkey (
          username,
          avatar_url
        )
      `
      )
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching blocked users:", fetchError.message);
      return NextResponse.json(
        { error: "Failed to fetch blocked users" },
        { status: 500 }
      );
    }

    // Flatten the profile join into the response
    const result = (blocked ?? []).map((entry) => {
      const profile = entry.profile as
        | { username: string | null; avatar_url: string | null }
        | null;
      return {
        id: entry.id,
        blocked_id: entry.blocked_id,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        created_at: entry.created_at,
      };
    });

    return NextResponse.json({ blocked: result });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/blocked-users:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createMobileClient();
    const body = await request.json();
    const { user_id } = body as { user_id?: string };

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    if (user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot block yourself" },
        { status: 400 }
      );
    }

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Upsert to handle UNIQUE constraint (already blocked -> return existing)
    const { data: blockedUser, error: insertError } = await supabase
      .from("blocked_users")
      .upsert(
        { blocker_id: user.id, blocked_id: user_id },
        { onConflict: "blocker_id,blocked_id" }
      )
      .select("id, blocker_id, blocked_id, created_at")
      .single();

    if (insertError) {
      console.error("Error blocking user:", insertError.message);
      return NextResponse.json(
        { error: "Failed to block user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ blocked_user: blockedUser }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/blocked-users:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createMobileClient();
    const body = await request.json();
    const { user_id } = body as { user_id?: string };

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", user_id);

    if (deleteError) {
      console.error("Error unblocking user:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to unblock user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/v1/blocked-users:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
