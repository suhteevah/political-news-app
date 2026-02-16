import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Redirect to the app's own origin, not the Supabase API URL
  const { origin } = new URL(request.url);
  return NextResponse.redirect(new URL("/", origin));
}
