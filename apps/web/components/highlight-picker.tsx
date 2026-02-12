"use client";

import { useState } from "react";

interface HighlightPost {
  id: string;
  content: string;
  x_author_handle: string | null;
  x_author_name: string | null;
  category: string;
  upvote_count: number;
  created_at: string;
}

export function HighlightPicker({ posts }: { posts: HighlightPost[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportScript() {
    const selectedPosts = posts.filter((p) => selected.has(p.id));
    const script = selectedPosts
      .map(
        (p, i) =>
          `--- Story ${i + 1} ---\nSource: @${p.x_author_handle}\nCategory: ${p.category}\n\n${p.content}\n`
      )
      .join("\n");

    // Copy to clipboard
    navigator.clipboard.writeText(script);
    alert(`Copied ${selectedPosts.length} stories to clipboard!`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {selected.size} stories selected
        </p>
        <button
          onClick={exportScript}
          disabled={selected.size === 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
        >
          Copy as Script
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => toggleSelect(post.id)}
            className={`text-left border rounded-xl p-4 transition-colors ${
              selected.has(post.id)
                ? "border-red-500 bg-red-500/10"
                : "border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>@{post.x_author_handle}</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800">
                {post.category}
              </span>
              <span className="ml-auto">{post.upvote_count} upvotes</span>
            </div>
            <p className="mt-2 text-gray-200 line-clamp-3">{post.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
