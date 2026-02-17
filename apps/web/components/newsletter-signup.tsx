"use client";

import { useState } from "react";
import { events } from "@/lib/analytics";

export function NewsletterSignup({ userEmail }: { userEmail?: string }) {
  const [email, setEmail] = useState(userEmail || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        events.newsletterSignup(userEmail ? "footer-authenticated" : "footer-anonymous");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-gradient-to-r from-red-950/40 to-gray-900/60 border border-red-800/30 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">🇺🇸</div>
        <h3 className="text-lg font-bold text-white">You&apos;re on the list!</h3>
        <p className="text-gray-400 text-sm mt-1">
          Expect your first Wire Report in your inbox soon.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-950/40 to-gray-900/60 border border-red-800/30 rounded-2xl p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white">
          The Wire Report — Free Weekly Digest
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          Top conservative stories, straight to your inbox every Monday. No spam, unsubscribe anytime.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>

      {status === "error" && (
        <p className="text-red-400 text-xs text-center mt-2">{errorMsg}</p>
      )}

      <p className="text-gray-600 text-xs text-center mt-3">
        Join 100+ patriots who get the news that matters.
      </p>
    </div>
  );
}
