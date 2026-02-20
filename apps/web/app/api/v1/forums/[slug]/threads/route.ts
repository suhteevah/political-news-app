import { NextResponse, type NextRequest } from "next/server";
import { createMobileClient as createClient } from "@/lib/supabase/mobile";

export async function POST(
  request: NextRequest,
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

    // Parse and validate body
    const body = await request.json();
    const { title, content } = body as { title?: string; content?: string };

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (title.trim().length > 300) {
      return NextResponse.json(
        { error: "Title must be 300 characters or fewer" },
        { status: 400 }
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

    // Insert the new thread
    const { data: thread, error: insertError } = await supabase
      .from("forum_threads")
      .insert({
        forum_id: forum.id,
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
      })
      .select(
        "id, forum_id, user_id, title, content, is_pinned, created_at"
      )
      .single();

    if (insertError) {
      console.error("Error creating thread:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ thread }, { status: 201 });
  } catch (err) {
    console.error(
      "Unexpected error in POST /api/v1/forums/[slug]/threads:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
