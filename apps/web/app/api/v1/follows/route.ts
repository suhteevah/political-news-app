import { NextRequest, NextResponse } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id } = body as { user_id?: string };

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 }
      );
    }

    if (user_id === authUser.id) {
      return NextResponse.json(
        { error: "You cannot follow yourself." },
        { status: 400 }
      );
    }

    // Verify the target user exists
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const { error: insertError } = await supabase
      .from("follows")
      .upsert(
        { follower_id: authUser.id, following_id: user_id },
        { onConflict: "follower_id,following_id" }
      );

    if (insertError) {
      console.error("Error following user:", insertError.message);
      return NextResponse.json(
        { error: "Failed to follow user." },
        { status: 500 }
      );
    }

    return NextResponse.json({ followed: true });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/follows:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id } = body as { user_id?: string };

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", authUser.id)
      .eq("following_id", user_id);

    if (deleteError) {
      console.error("Error unfollowing user:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to unfollow user." },
        { status: 500 }
      );
    }

    return NextResponse.json({ unfollowed: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/v1/follows:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
