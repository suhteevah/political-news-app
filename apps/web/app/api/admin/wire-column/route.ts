import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const OWNER_USER_ID = "2dea127a-e812-41f1-9e83-95b12710b890";
const WIRE_USER_ID = process.env.WIRE_USER_ID!;

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Return the most recent pending column for admin review
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = getAdminClient();

  const { data: column, error } = await admin
    .from("wire_columns")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pending column:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch pending column" },
      { status: 500 }
    );
  }

  return NextResponse.json({ column: column || null });
}

// POST: Approve or kill a pending column
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, columnId } = body as {
    action?: string;
    columnId?: string;
  };

  if (!action || !["approve", "kill"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'kill'" },
      { status: 400 }
    );
  }

  if (!columnId || typeof columnId !== "string") {
    return NextResponse.json(
      { error: "columnId is required" },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  // Verify the column exists and is pending
  const { data: column, error: fetchError } = await admin
    .from("wire_columns")
    .select("*")
    .eq("id", columnId)
    .single();

  if (fetchError || !column) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  if (column.status !== "pending") {
    return NextResponse.json(
      { error: `Column is already ${column.status}` },
      { status: 409 }
    );
  }

  if (action === "kill") {
    const { error: killError } = await admin
      .from("wire_columns")
      .update({ status: "killed" })
      .eq("id", columnId);

    if (killError) {
      console.error("Error killing column:", killError.message);
      return NextResponse.json(
        { error: "Failed to kill column" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Column killed",
      columnId,
      status: "killed",
    });
  }

  // action === "approve"
  // Insert the column as a post and mark as published
  const now = new Date().toISOString();

  const { data: post, error: postError } = await admin
    .from("posts")
    .insert({
      content: column.content,
      source: "wire",
      category: "Analysis",
      x_author_name: "WIRE",
      x_author_handle: "wire",
      is_breaking: false,
      created_at: now,
    })
    .select("id")
    .single();

  if (postError) {
    console.error("Error creating column post:", postError.message);
    return NextResponse.json(
      { error: "Failed to publish column as post" },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("wire_columns")
    .update({
      status: "published",
      post_id: post.id,
      published_at: now,
    })
    .eq("id", columnId);

  if (updateError) {
    console.error("Error updating column status:", updateError.message);
    return NextResponse.json(
      { error: "Post created but failed to update column status" },
      { status: 500 }
    );
  }

  // Track analytics event
  await admin.from("analytics_events").insert({
    event_type: "wire_column_published",
    user_id: user.id,
    metadata: {
      column_id: columnId,
      post_id: post.id,
      title: column.title,
    },
  });

  return NextResponse.json({
    message: "Column approved and published",
    columnId,
    postId: post.id,
    status: "published",
  });
}
