"use client";

import { useEffect, useState } from "react";

interface PendingColumn {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function WireColumnPreview() {
  const [column, setColumn] = useState<PendingColumn | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function fetchColumn() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wire-column");
      if (res.ok) {
        const data = await res.json();
        setColumn(data.column ?? null);
      } else {
        setColumn(null);
      }
    } catch {
      setColumn(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchColumn();
  }, []);

  async function handleAction(action: "approve" | "kill") {
    if (!column || acting) return;
    setActing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/wire-column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, columnId: column.id }),
      });

      if (res.ok) {
        const verb = action === "approve" ? "approved and published" : "killed";
        setMessage({ type: "success", text: `Column ${verb}.` });
        setColumn(null);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || `Failed to ${action} column.` });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-amber-400">Pending WIRE Column</h2>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-amber-400">Pending WIRE Column</h2>

      {message && (
        <p
          className={`text-sm mb-3 ${
            message.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {!column ? (
        <p className="text-gray-500 text-sm">No pending columns to review.</p>
      ) : (
        <div>
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-200">{column.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generated: {new Date(column.created_at).toLocaleString()}
            </p>
          </div>

          <div className="mb-4 max-h-96 overflow-y-auto rounded-lg bg-gray-900/50 border border-gray-700 p-4">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{column.content}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAction("approve")}
              disabled={acting}
              className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {acting ? "Processing..." : "Approve & Publish"}
            </button>
            <button
              onClick={() => handleAction("kill")}
              disabled={acting}
              className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {acting ? "Processing..." : "Kill"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
