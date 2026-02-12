"use client";

import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@repo/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddSourceForm() {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("Politics");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase.from("curated_sources").insert({
      x_handle: handle.replace("@", ""),
      display_name: displayName,
      category,
    });

    setHandle("");
    setDisplayName("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Add X Source</h2>
      <input
        type="text"
        placeholder="@handle (e.g. LibHivemind)"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        required
        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <input
        type="text"
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-red-500"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
      >
        Add Source
      </button>
    </form>
  );
}
