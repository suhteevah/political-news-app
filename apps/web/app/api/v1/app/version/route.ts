import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/mobile";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform || !["ios", "android"].includes(platform)) {
      return NextResponse.json(
        { error: "platform is required and must be 'ios' or 'android'" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Fetch platform-specific config values from app_config table
    const keys = [
      `${platform}_min_version`,
      `${platform}_current_version`,
      "force_update",
      "maintenance_mode",
    ];

    const { data: configs, error } = await admin
      .from("app_config")
      .select("key, value")
      .in("key", keys);

    if (error) {
      console.error("Error fetching app config:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch app configuration" },
        { status: 500 }
      );
    }

    // Build a lookup map from the config rows
    const configMap: Record<string, unknown> = {};
    for (const row of configs ?? []) {
      configMap[row.key] = row.value;
    }

    return NextResponse.json({
      min_version: configMap[`${platform}_min_version`] ?? "1.0.0",
      current_version: configMap[`${platform}_current_version`] ?? "1.0.0",
      force_update: configMap["force_update"] ?? false,
      maintenance_mode: configMap["maintenance_mode"] ?? false,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/v1/app/version:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
