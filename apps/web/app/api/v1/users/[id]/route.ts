import { NextRequest, NextResponse } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, created_at")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Get follower count (people who follow this user)
    const { count: followerCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", id);

    // Get following count (people this user follows)
    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", id);

    // Check if the requesting user is authenticated and following this user
    let isFollowing: boolean | undefined;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const { data: followRow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", authUser.id)
        .eq("following_id", id)
        .maybeSingle();

      isFollowing = !!followRow;
    }

    const response: Record<string, unknown> = {
      user: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        created_at: profile.created_at,
        follower_count: followerCount ?? 0,
        following_count: followingCount ?? 0,
        ...(isFollowing !== undefined && { is_following: isFollowing }),
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/users/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
