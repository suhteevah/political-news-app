import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List user's keyword alerts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: alerts } = await supabase
    .from("keyword_alerts")
    .select("id, keywords, is_active, last_triggered_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ alerts: alerts || [] });
}

// POST: Create a new keyword alert
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { keywords } = body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json(
      { error: "Keywords array is required" },
      { status: 400 }
    );
  }

  const { data: alert, error } = await supabase
    .from("keyword_alerts")
    .insert({
      user_id: user.id,
      keywords: keywords.map((k: string) => k.trim().toLowerCase()),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert });
}

// PUT: Update a keyword alert (toggle active, update keywords)
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, is_active, keywords } = body;

  if (!id) {
    return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof is_active === "boolean") updates.is_active = is_active;
  if (keywords) updates.keywords = keywords;

  const { error } = await supabase
    .from("keyword_alerts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: true });
}

// DELETE: Remove a keyword alert
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("keyword_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
