import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function NavBar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold text-red-500 tracking-tight">
          The Right Wire
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/community" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
            Community
          </Link>
          <Link href="/forums" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
            Forums
          </Link>
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
            Pricing
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-100 transition-colors" title="Intelligence Dashboard">
                📊 Intel
              </Link>
              <Link href="/feed-settings" className="text-sm text-gray-400 hover:text-gray-100 transition-colors" title="Customize Feed">
                ⚙️ Feed
              </Link>
              <Link href="/profile" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
                Profile
              </Link>
            </>
          ) : (
            <Link href="/login" className="text-sm px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
