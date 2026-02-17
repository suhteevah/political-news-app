"use client";

import { useState } from "react";

export function IntelligenceDashboard() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownloadBrief() {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/intelligence/brief");
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Download failed" }));
        setError(data.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `intelligence-brief-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download brief. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Wire Intelligence Dashboard</h1>
      <p className="text-gray-400 text-sm mb-8">
        Your command center for political news analysis
      </p>

      {/* Intelligence Brief */}
      <div className="border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>📊</span> Daily Intelligence Brief
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Executive summary of the last 24 hours — top stories, trending
              topics, category breakdown, and engagement analytics in a
              professional 2-page PDF.
            </p>
          </div>
          <button
            onClick={handleDownloadBrief}
            disabled={downloading}
            className="shrink-0 ml-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg font-semibold text-sm transition-colors"
          >
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Keyword Alerts */}
      <div className="border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🔔</span> Keyword Alerts
        </h2>
        <p className="text-gray-400 text-sm mt-1 mb-4">
          Get notified when specific topics trend in the news cycle.
        </p>
        <KeywordAlertManager />
      </div>

      {/* Quick Stats Preview */}
      <div className="border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <span>📈</span> Trend Snapshot
        </h2>
        <TrendSnapshot />
      </div>

      {/* Data API Access */}
      <div className="border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🔗</span> Data API
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Access posts data programmatically via our REST API.
        </p>
        <code className="block mt-3 p-3 bg-gray-900 rounded-lg text-xs text-gray-300 font-mono">
          GET https://the-right-wire.com/api/v1/posts?limit=50&category=Politics
        </code>
        <p className="text-gray-500 text-xs mt-2">
          Include your API key in the Authorization header. Rate limited to 100
          requests/hour.
        </p>
      </div>
    </div>
  );
}

function KeywordAlertManager() {
  const [keywords, setKeywords] = useState<
    { id: string; keywords: string[]; is_active: boolean }[]
  >([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadAlerts() {
    const res = await fetch("/api/keyword-alerts");
    if (res.ok) {
      const data = await res.json();
      setKeywords(data.alerts || []);
    }
    setLoaded(true);
  }

  if (!loaded) {
    loadAlerts();
    return <p className="text-gray-500 text-sm">Loading alerts...</p>;
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    setSaving(true);
    const res = await fetch("/api/keyword-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: [newKeyword.trim()] }),
    });
    if (res.ok) {
      const data = await res.json();
      setKeywords((prev) => [...prev, data.alert]);
      setNewKeyword("");
    }
    setSaving(false);
  }

  async function toggleAlert(id: string, is_active: boolean) {
    await fetch("/api/keyword-alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    setKeywords((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
    );
  }

  async function deleteAlert(id: string) {
    await fetch("/api/keyword-alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeywords((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
          placeholder="e.g. tariffs, impeachment, border..."
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-red-600"
        />
        <button
          onClick={addKeyword}
          disabled={saving || !newKeyword.trim()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-lg text-sm font-semibold transition-colors"
        >
          Add
        </button>
      </div>
      {keywords.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No keyword alerts set up yet. Add keywords to track.
        </p>
      ) : (
        <div className="space-y-2">
          {keywords.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleAlert(alert.id, alert.is_active)}
                  className={`w-8 h-5 rounded-full transition-colors ${
                    alert.is_active ? "bg-red-600" : "bg-gray-600"
                  } relative`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      alert.is_active ? "left-3.5" : "left-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm">
                  {alert.keywords.join(", ")}
                </span>
              </div>
              <button
                onClick={() => deleteAlert(alert.id)}
                className="text-gray-500 hover:text-red-400 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendSnapshot() {
  const [data, setData] = useState<{
    totalPosts: number;
    categories: { category: string; count: number }[];
    topSources: { source: string; count: number }[];
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadTrends() {
    const res = await fetch("/api/trends");
    if (res.ok) {
      const d = await res.json();
      setData(d);
    }
    setLoaded(true);
  }

  if (!loaded) {
    loadTrends();
    return <p className="text-gray-500 text-sm">Loading trends...</p>;
  }

  if (!data) {
    return <p className="text-gray-500 text-sm">Unable to load trend data.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {data.totalPosts}
          </div>
          <div className="text-xs text-gray-500 mt-1">Posts (24h)</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {data.categories.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active Categories</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {data.topSources.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active Sources</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-300 mb-2">
        Category Breakdown (24h)
      </h3>
      <div className="space-y-1.5 mb-4">
        {data.categories.slice(0, 7).map((cat) => (
          <div key={cat.category} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-20 text-right">
              {cat.category}
            </span>
            <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
              <div
                className="bg-red-600 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (cat.count / data.totalPosts) * 100
                  )}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8">{cat.count}</span>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-300 mb-2">
        Top Sources (24h)
      </h3>
      <div className="flex flex-wrap gap-2">
        {data.topSources.slice(0, 10).map((src) => (
          <span
            key={src.source}
            className="text-xs px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-full text-gray-300"
          >
            @{src.source}{" "}
            <span className="text-gray-500">({src.count})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
