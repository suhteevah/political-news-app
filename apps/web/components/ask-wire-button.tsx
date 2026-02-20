"use client";

import { useState } from "react";
import { WireBadge } from "./wire-badge";

export function AskWireButton({ postId }: { postId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ response: string; mode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/wire/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, question: question.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ? `${data.error}: ${data.detail}` : (data.error || "Something went wrong"));
        return;
      }

      setResult({ response: data.comment.content, mode: data.mode });
      setQuestion("");
    } catch {
      setError("Failed to reach WIRE. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-800/40 bg-amber-950/10 text-amber-400 hover:bg-amber-950/20 transition-colors text-sm font-medium"
      >
        <span>⚡</span>
        Ask WIRE
      </button>
    );
  }

  return (
    <div className="border border-amber-800/40 rounded-xl p-4 bg-amber-950/10">
      <div className="flex items-center gap-2 mb-3">
        <WireBadge size="md" />
        <span className="text-sm text-gray-400">Ask WIRE anything about this story</span>
        <button
          onClick={() => setIsOpen(false)}
          className="ml-auto text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {result && (
        <div className="mb-3 p-3 rounded-lg bg-gray-900/50 border border-amber-900/30">
          <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
            <WireBadge />
            <span>{result.mode === "facts" ? "Facts Mode" : "Commentator Mode"}</span>
          </div>
          <p className="text-gray-200 text-sm">{result.response}</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Type your question..."
          maxLength={500}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-amber-700"
          disabled={loading}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Tip: Prefix with &quot;[facts]&quot; for factual-only mode
      </p>
    </div>
  );
}
