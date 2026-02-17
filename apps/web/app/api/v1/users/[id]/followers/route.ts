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

    // Get followers with profile data
    const { data: followRows, count, error } = await supabase
      .from("follows")
      .select(
        "follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)",
        { count: "exact" }
      )
      .eq("following_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching followers:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch followers." },
        { status: 500 }
      );
    }

    const followers = (followRows ?? []).map((row) => {
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
      followers,
      total: count ?? 0,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/users/[id]/followers:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
