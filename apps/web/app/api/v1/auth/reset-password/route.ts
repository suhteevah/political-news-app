import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token, new_password } = body as {
      access_token?: string;
      refresh_token?: string;
      new_password?: string;
    };

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "Access token and refresh token are required." },
        { status: 400 }
      );
    }

    if (!new_password) {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Create a fresh Supabase client and set the session from the reset tokens
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      return NextResponse.json(
        { error: "Invalid or expired reset token." },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Password updated successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
