import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OWNER_USER_ID = "2dea127a-e812-41f1-9e83-95b12710b890";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get last 30 posts for the admin to pick from
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, x_author_name, x_author_handle, category, created_at, is_breaking")
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ posts: posts || [] });
}
