"use client";

import { useEffect, useState } from "react";

interface WireConfig {
  enabled: boolean;
  briefing_enabled: boolean;
  column_enabled: boolean;
  daily_ask_limit_free: number;
  daily_ask_limit_pro: number;
  daily_ask_limit_intelligence: number;
  site_wide_daily_ask_cap: number;
  max_breaking_comments_per_day: number;
  max_hot_takes_per_day: number;
  hot_take_upvote_threshold: number;
  hot_take_comment_threshold: number;
  hot_take_window_minutes: number;
  commentator_model: string;
  facts_model: string;
}

const DEFAULT_CONFIG: WireConfig = {
  enabled: false,
  briefing_enabled: false,
  column_enabled: false,
  daily_ask_limit_free: 3,
  daily_ask_limit_pro: 15,
  daily_ask_limit_intelligence: 50,
  site_wide_daily_ask_cap: 500,
  max_breaking_comments_per_day: 10,
  max_hot_takes_per_day: 8,
  hot_take_upvote_threshold: 10,
  hot_take_comment_threshold: 5,
  hot_take_window_minutes: 60,
  commentator_model: "claude-3-haiku-20240307",
  facts_model: "claude-3-haiku-20240307",
};

const BOOLEAN_FIELDS: (keyof WireConfig)[] = [
  "enabled",
  "briefing_enabled",
  "column_enabled",
];

const NUMBER_FIELDS: { key: keyof WireConfig; label: string }[] = [
  { key: "daily_ask_limit_free", label: "Daily Ask Limit (Free)" },
  { key: "daily_ask_limit_pro", label: "Daily Ask Limit (Pro)" },
  { key: "daily_ask_limit_intelligence", label: "Daily Ask Limit (Intelligence)" },
  { key: "site_wide_daily_ask_cap", label: "Site-Wide Daily Ask Cap" },
  { key: "max_breaking_comments_per_day", label: "Max Breaking Comments/Day" },
  { key: "max_hot_takes_per_day", label: "Max Hot Takes/Day" },
  { key: "hot_take_upvote_threshold", label: "Hot Take Upvote Threshold" },
  { key: "hot_take_comment_threshold", label: "Hot Take Comment Threshold" },
  { key: "hot_take_window_minutes", label: "Hot Take Window (minutes)" },
];

const TEXT_FIELDS: { key: keyof WireConfig; label: string }[] = [
  { key: "commentator_model", label: "Commentator Model" },
  { key: "facts_model", label: "Facts Model" },
];

export function WireConfigPanel() {
  const [config, setConfig] = useState<WireConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/wire-config");
        if (res.ok) {
          const data = await res.json();
          setConfig({ ...DEFAULT_CONFIG, ...data });
        }
      } catch {
        // Use defaults if fetch fails
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/wire-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Configuration saved." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof WireConfig, value: string | number | boolean) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-amber-400">⚡ WIRE AI Configuration</h2>
        <p className="text-gray-500 text-sm">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-amber-400">⚡ WIRE AI Configuration</h2>

      {/* Boolean Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {BOOLEAN_FIELDS.map((key) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={config[key] as boolean}
              onClick={() => updateField(key, !config[key])}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                config[key] ? "bg-amber-600" : "bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  config[key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-gray-300 capitalize">
              {key.replace(/_/g, " ")}
            </span>
          </label>
        ))}
      </div>

      {/* Number Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {NUMBER_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              value={config[key] as number}
              onChange={(e) => updateField(key, parseInt(e.target.value, 10) || 0)}
              min={0}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-amber-700"
            />
          </div>
        ))}
      </div>

      {/* Text Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {TEXT_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type="text"
              value={config[key] as string}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-amber-700"
            />
          </div>
        ))}
      </div>

      {/* Save Button + Status */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
