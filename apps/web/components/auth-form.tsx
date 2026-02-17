"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = [
  "admin", "administrator", "mod", "moderator", "owner",
  "superuser", "super_user", "superadmin", "super_admin",
  "root", "system", "sysadmin", "sys_admin",
  "staff", "support", "help", "official",
  "therightwire", "the_right_wire", "rightwire", "right_wire",
  "wire_admin", "wire_mod", "wire_official",
  "null", "undefined", "anonymous", "deleted",
];

function isReservedUsername(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[\s\-_.]/g, "");
  return RESERVED_USERNAMES.some(
    (reserved) => normalized === reserved.replace(/[\s\-_.]/g, "") || normalized.includes("admin") || normalized.includes("moderator")
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      // Block reserved/admin-like usernames
      if (isReservedUsername(username)) {
        setError("That username is reserved. Please choose a different one.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Track referral if user came via referral link
      fetch("/api/referral/track", { method: "POST" }).catch(() => {});
      router.push("/");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      {mode === "signup" && (
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
      >
        {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
      </button>
      <a
        href={mode === "login" ? "/signup" : "/login"}
        className="text-center text-sm text-gray-400 hover:text-gray-200"
      >
        {mode === "login"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </a>
    </form>
  );
}
