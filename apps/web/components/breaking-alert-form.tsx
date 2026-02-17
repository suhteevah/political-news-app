"use client";

import { useState, useEffect } from "react";

interface RecentPost {
  id: string;
  content: string;
  x_author_name: string;
  x_author_handle: string;
  category: string;
  created_at: string;
  is_breaking: boolean;
}

export function BreakingAlertForm() {
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<{ postId: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts/recent")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSendAlert(postId: string) {
    if (!confirm("Send breaking news alert to ALL Pro subscribers? This cannot be undone.")) {
      return;
    }

    setSending(postId);
    setResult(null);

    try {
      const res = await fetch("/api/admin/breaking-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ postId, message: `Error: ${data.error}` });
      } else {
        setResult({ postId, message: data.message });
        // Mark the post as breaking in local state
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_breaking: true } : p))
        );
      }
    } catch {
      setResult({ postId, message: "Network error" });
    }

    setSending(null);
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading recent posts...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">🚨 Send Breaking Alert</h2>
      <p className="text-sm text-gray-400 mb-4">
        Select a post to send as a breaking news alert to all Pro subscribers.
      </p>

      {result && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          result.message.startsWith("Error")
            ? "bg-red-950/30 border border-red-800/20 text-red-400"
            : "bg-green-950/30 border border-green-800/20 text-green-400"
        }`}>
          {result.message}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {posts.length === 0 && (
          <p className="text-gray-500 text-sm">No recent posts found.</p>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className={`border rounded-lg p-3 flex items-start gap-3 ${
              post.is_breaking
                ? "border-red-800/40 bg-red-950/20"
                : "border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span className="font-medium text-gray-300">
                  {post.x_author_name}
                </span>
                <span>·</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                  {post.category}
                </span>
                <span>·</span>
                <span>{new Date(post.created_at).toLocaleString()}</span>
                {post.is_breaking && (
                  <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 font-semibold">
                    ALERT SENT
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">{post.content}</p>
            </div>
            <button
              onClick={() => handleSendAlert(post.id)}
              disabled={post.is_breaking || sending === post.id}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                post.is_breaking
                  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : sending === post.id
                  ? "bg-red-800 text-white opacity-50"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {post.is_breaking
                ? "Sent"
                : sending === post.id
                ? "Sending..."
                : "🚨 Alert"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
