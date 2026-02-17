import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );

    const supabase = await createClient();

    // Verify the user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Get following with profile data
    const { data: followRows, count, error } = await supabase
      .from("follows")
      .select(
        "following_id, profiles!follows_following_id_fkey(id, username, display_name, avatar_url)",
        { count: "exact" }
      )
      .eq("follower_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching following:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch following." },
        { status: 500 }
      );
    }

    const following = (followRows ?? []).map((row) => {
      const p = row.profiles as unknown as {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      return {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      };
    });

    return NextResponse.json({
      following,
      total: count ?? 0,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/users/[id]/following:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
