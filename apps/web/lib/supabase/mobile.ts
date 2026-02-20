import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

/**
 * Creates a Supabase client authenticated via Bearer token from the Authorization header.
 * This is the primary auth method for mobile apps (iOS/Android) which send
 * `Authorization: Bearer <access_token>` instead of cookies.
 *
 * Falls back to an anonymous client if no Authorization header is present.
 * All RLS policies apply based on the authenticated user.
 */
export async function createMobileClient() {
  const headersList = await headers();
  const authorization = headersList.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    // Return anonymous client (no user context — public data only)
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Create client with the user's access token in the Authorization header
  // This makes Supabase resolve auth.uid() correctly for RLS policies
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS — use only for server-side operations that need
 * cross-user access (e.g., inserting WIRE comments, validating IAP receipts).
 */
export function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Helper to extract and validate the authenticated user from a mobile request.
 * Returns the user object or null if not authenticated.
 */
export async function getMobileUser() {
  const supabase = await createMobileClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
