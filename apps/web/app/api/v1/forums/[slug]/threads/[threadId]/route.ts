import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const { slug, threadId } = await params;

    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createMobileClient();

    // Verify the forum exists by slug
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

    // Verify the thread exists and belongs to this forum
    const { data: thread, error: threadError } = await supabase
      .from("forum_threads")
      .select("id, user_id, forum_id")
      .eq("id", threadId)
      .eq("forum_id", forum.id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Verify the thread belongs to the authenticated user
    if (thread.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own threads" },
        { status: 403 }
      );
    }

    // Delete the thread
    const { error: deleteError } = await supabase
      .from("forum_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting thread:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "Unexpected error in DELETE /api/v1/forums/[slug]/threads/[threadId]:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
