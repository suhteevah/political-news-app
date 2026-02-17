import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Look up the forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("id")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json(
        { error: "Forum not found" },
        { status: 404 }
      );
    }

    // Insert membership, ignoring conflict if already a member
    const { error: insertError } = await supabase
      .from("forum_memberships")
      .upsert(
        { forum_id: forum.id, user_id: user.id },
        { onConflict: "forum_id,user_id", ignoreDuplicates: true }
      );

    if (insertError) {
      console.error("Error joining forum:", insertError.message);
      return NextResponse.json(
        { error: "Failed to join forum" },
        { status: 500 }
      );
    }

    return NextResponse.json({ joined: true });
  } catch (err) {
    console.error(
      "Unexpected error in POST /api/v1/forums/[slug]/membership:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Look up the forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("id")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json(
        { error: "Forum not found" },
        { status: 404 }
      );
    }

    // Delete the membership row
    const { error: deleteError } = await supabase
      .from("forum_memberships")
      .delete()
      .eq("forum_id", forum.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error leaving forum:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to leave forum" },
        { status: 500 }
      );
    }

    return NextResponse.json({ left: true });
  } catch (err) {
    console.error(
      "Unexpected error in DELETE /api/v1/forums/[slug]/membership:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
