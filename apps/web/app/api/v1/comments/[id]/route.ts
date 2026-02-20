import { NextResponse, type NextRequest } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

const EDIT_WINDOW_MINUTES = 15; // Allow editing within 15 minutes of creation

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Comment must be 5000 characters or less" },
        { status: 400 }
      );
    }

    // Fetch the comment to verify ownership and edit window
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("id, user_id, created_at")
      .eq("id", id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: you can only edit your own comments" },
        { status: 403 }
      );
    }

    // Check edit window
    const createdAt = new Date(comment.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesSinceCreation > EDIT_WINDOW_MINUTES) {
      return NextResponse.json(
        { error: `Comments can only be edited within ${EDIT_WINDOW_MINUTES} minutes of creation` },
        { status: 403 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("comments")
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, post_id, user_id, content, parent_id, upvote_count, created_at, edited_at")
      .single();

    if (updateError) {
      console.error("Error updating comment:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment: updated });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/v1/comments/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the comment to verify ownership
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: you can only delete your own comments" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/v1/comments/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
