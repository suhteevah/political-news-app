"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function VoteButton({
  targetType,
  targetId,
  initialCount,
}: {
  targetType: "post" | "comment";
  targetId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const supabase = createClient();

  async function handleVote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (voted) {
      await supabase
        .from("votes")
        .delete()
        .eq("user_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      setCount((c) => c - 1);
      setVoted(false);
    } else {
      await supabase.from("votes").upsert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        value: 1,
      });
      setCount((c) => c + 1);
      setVoted(true);
    }
  }

  return (
    <button
      onClick={handleVote}
      className={`flex items-center gap-1 text-sm transition-colors ${
        voted ? "text-red-500" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      <svg className="w-4 h-4" fill={voted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      {count}
    </button>
  );
}
