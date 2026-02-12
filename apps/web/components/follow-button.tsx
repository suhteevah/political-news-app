"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowButton({
  targetUserId,
  isFollowing: initialFollowing,
}: {
  targetUserId: string;
  isFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleClick() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      setFollowing(true);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
        following
          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
          : "bg-red-600 text-white hover:bg-red-700"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
