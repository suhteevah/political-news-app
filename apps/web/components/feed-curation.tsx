"use client";

import { useState, useEffect } from "react";

interface Source {
  x_handle: string;
  display_name: string;
  category: string;
}

type Preference = "pinned" | "muted" | "default";

export function FeedCuration() {
  const [sources, setSources] = useState<Source[]>([]);
  const [preferences, setPreferences] = useState<Record<string, Preference>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pinned" | "muted">("all");

  useEffect(() => {
    fetch("/api/feed-preferences")
      .then((r) => r.json())
      .then((data) => {
        setSources(data.sources || []);
        setPreferences(data.preferences || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleToggle(handle: string, pref: Preference) {
    setSaving(handle);

    // Cycle: default → pinned → muted → default
    const current = preferences[handle] || "default";
    const next = pref === current ? "default" : pref;

    try {
      await fetch("/api/feed-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceHandle: handle, preference: next }),
      });

      setPreferences((prev) => {
        const updated = { ...prev };
        if (next === "default") {
          delete updated[handle];
        } else {
          updated[handle] = next;
        }
        return updated;
      });
    } catch {
      // silent fail
    }

    setSaving(null);
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading sources...</div>;
  }

  // Group by category
  const categories = [...new Set(sources.map((s) => s.category))];

  const filteredSources = sources.filter((s) => {
    if (filter === "pinned") return preferences[s.x_handle] === "pinned";
    if (filter === "muted") return preferences[s.x_handle] === "muted";
    return true;
  });

  const pinnedCount = Object.values(preferences).filter((p) => p === "pinned").length;
  const mutedCount = Object.values(preferences).filter((p) => p === "muted").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Customize Your Feed</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Pin sources you love, mute ones you don&apos;t
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          <span className="px-2 py-1 rounded bg-green-950/30 text-green-400 border border-green-800/20">
            {pinnedCount} pinned
          </span>
          <span className="px-2 py-1 rounded bg-gray-900 text-gray-500 border border-gray-800">
            {mutedCount} muted
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "pinned", "muted"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f === "all" ? `All (${sources.length})` : f === "pinned" ? `Pinned (${pinnedCount})` : `Muted (${mutedCount})`}
          </button>
        ))}
      </div>

      {/* Source list */}
      <div className="flex flex-col gap-1">
        {filteredSources.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">
            {filter === "pinned"
              ? "No pinned sources yet. Pin your favorites!"
              : filter === "muted"
              ? "No muted sources. Mute sources you want to hide."
              : "No sources available."}
          </p>
        )}
        {categories.map((cat) => {
          const catSources = filteredSources.filter((s) => s.category === cat);
          if (catSources.length === 0) return null;

          return (
            <div key={cat} className="mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                {cat}
              </h3>
              {catSources.map((source) => {
                const pref = preferences[source.x_handle] || "default";
                const isSaving = saving === source.x_handle;

                return (
                  <div
                    key={source.x_handle}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      pref === "pinned"
                        ? "bg-green-950/20 border border-green-800/20"
                        : pref === "muted"
                        ? "bg-gray-900/50 border border-gray-800/50 opacity-60"
                        : "hover:bg-gray-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm text-gray-200 truncate">
                        {source.display_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        @{source.x_handle}
                      </span>
                      {pref === "pinned" && (
                        <span className="text-xs text-green-400">📌</span>
                      )}
                      {pref === "muted" && (
                        <span className="text-xs text-gray-600">🔇</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggle(source.x_handle, "pinned")}
                        disabled={isSaving}
                        className={`p-1.5 rounded text-xs transition-colors ${
                          pref === "pinned"
                            ? "bg-green-600/20 text-green-400"
                            : "text-gray-500 hover:text-green-400 hover:bg-green-950/30"
                        }`}
                        title={pref === "pinned" ? "Unpin" : "Pin to top"}
                      >
                        📌
                      </button>
                      <button
                        onClick={() => handleToggle(source.x_handle, "muted")}
                        disabled={isSaving}
                        className={`p-1.5 rounded text-xs transition-colors ${
                          pref === "muted"
                            ? "bg-gray-600/20 text-gray-400"
                            : "text-gray-500 hover:text-gray-400 hover:bg-gray-900"
                        }`}
                        title={pref === "muted" ? "Unmute" : "Mute this source"}
                      >
                        🔇
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
