import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const OWNER_USER_ID = "2dea127a-e812-41f1-9e83-95b12710b890";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Return all wire_config as a key-value object
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = getAdminClient();

  const { data: rows, error } = await admin
    .from("wire_config")
    .select("key, value, updated_at")
    .order("key");

  if (error) {
    console.error("Error fetching wire config:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }

  // Transform rows into { key: value } object
  const config: Record<string, unknown> = {};
  for (const row of rows || []) {
    config[row.key] = row.value;
  }

  return NextResponse.json({ config });
}

// PUT: Update config values
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== OWNER_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { updates } = body as { updates?: Record<string, unknown> };

  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "updates object is required with at least one key-value pair" },
      { status: 400 }
    );
  }

  const admin = getAdminClient();
  const errors: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const { error } = await admin
      .from("wire_config")
      .upsert(
        {
          key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error(`Error updating wire_config key "${key}":`, error.message);
      errors.push(`Failed to update "${key}": ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Some config updates failed", details: errors },
      { status: 500 }
    );
  }

  // Return updated config
  const { data: rows } = await admin
    .from("wire_config")
    .select("key, value")
    .order("key");

  const config: Record<string, unknown> = {};
  for (const row of rows || []) {
    config[row.key] = row.value;
  }

  return NextResponse.json({ config, updated: Object.keys(updates) });
}
