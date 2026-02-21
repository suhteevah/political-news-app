import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createMobileClient();

    const body = await request.json();
    const { token, platform, app_version } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "token is required and must be a string" },
        { status: 400 }
      );
    }

    if (platform !== "ios" && platform !== "android") {
      return NextResponse.json(
        { error: "platform must be 'ios' or 'android'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("device_tokens")
      .upsert(
        {
          token,
          user_id: user.id,
          platform,
          app_version: app_version || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error registering device token:", error);
      return NextResponse.json(
        { error: "Failed to register device token" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Device registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createMobileClient();

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "token is required and must be a string" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("device_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", token);

    if (error) {
      console.error("Error unregistering device token:", error);
      return NextResponse.json(
        { error: "Failed to unregister device token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Device unregistration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
