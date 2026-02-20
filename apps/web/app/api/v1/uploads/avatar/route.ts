import { NextRequest, NextResponse } from "next/server";
import { createMobileClient, getMobileUser } from "@/lib/supabase/mobile";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const user = await getMobileUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No avatar file provided. Use form field name 'avatar'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    const supabase = await createMobileClient();

    // Generate a unique path for the avatar
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("user-uploads")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload avatar" },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("user-uploads")
      .getPublicUrl(path);

    const avatarUrl = urlData.publicUrl;

    // Update the user's profile with the new avatar URL
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError.message);
      return NextResponse.json(
        { error: "Avatar uploaded but failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      avatar_url: avatarUrl,
      message: "Avatar updated successfully",
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/v1/uploads/avatar:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
