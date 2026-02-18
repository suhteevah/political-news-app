import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isWireEnabled } from "@/lib/wire-ai";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Check global WIRE kill switch
  const enabled = await isWireEnabled(supabase);
  if (!enabled) {
    return NextResponse.json({ message: "WIRE AI is disabled" });
  }

  // Fetch the most recent pending column
  const { data: column, error: columnError } = await supabase
    .from("wire_columns")
    .select("id, content")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (columnError || !column) {
    return NextResponse.json({
      message: "No pending column found to publish",
    });
  }

  // Insert as a WIRE post
  const { data: insertedPost, error: insertError } = await supabase
    .from("posts")
    .insert({
      source: "wire",
      user_id: process.env.WIRE_USER_ID,
      x_author_name: "WIRE",
      x_author_handle: "wire",
      content: column.content,
      category: "Analysis",
      media_urls: [],
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Failed to publish WIRE column as post:", insertError.message);
    return NextResponse.json(
      { error: "Failed to publish column", details: insertError.message },
      { status: 500 }
    );
  }

  // Update wire_columns: mark as published with post reference
  const { error: updateError } = await supabase
    .from("wire_columns")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      post_id: insertedPost.id,
    })
    .eq("id", column.id);

  if (updateError) {
    console.error("Failed to update column status:", updateError.message);
    // Post was already created, so we log but don't fail the response
  }

  // Track analytics event
  await supabase.from("analytics_events").insert({
    event_type: "wire_column_published",
    metadata: { column_id: column.id, post_id: insertedPost.id },
  });

  return NextResponse.json({
    message: "WIRE weekly column published successfully",
    post_id: insertedPost.id,
  });
}
