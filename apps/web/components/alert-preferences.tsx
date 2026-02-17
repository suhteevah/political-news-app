"use client";

import { useState, useEffect } from "react";
import { CATEGORIES } from "@repo/shared";

interface AlertPrefs {
  breaking_alerts: boolean;
  daily_digest: boolean;
  alert_categories: string[];
}

export function AlertPreferences() {
  const [prefs, setPrefs] = useState<AlertPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email-preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs(data.preferences || {
          breaking_alerts: true,
          daily_digest: true,
          alert_categories: [...CATEGORIES],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);

    try {
      await fetch("/api/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent fail
    }

    setSaving(false);
  }

  function toggleCategory(cat: string) {
    if (!prefs) return;
    const cats = prefs.alert_categories.includes(cat)
      ? prefs.alert_categories.filter((c) => c !== cat)
      : [...prefs.alert_categories, cat];
    setPrefs({ ...prefs, alert_categories: cats });
  }

  if (loading || !prefs) {
    return null;
  }

  return (
    <div className="border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-3">Email Preferences</h2>

      <div className="flex flex-col gap-4">
        {/* Daily Digest Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.daily_digest}
            onChange={(e) => setPrefs({ ...prefs, daily_digest: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-200">Daily Digest</span>
            <p className="text-xs text-gray-500">Top stories delivered every morning at 7am EST</p>
          </div>
        </label>

        {/* Breaking Alerts Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.breaking_alerts}
            onChange={(e) => setPrefs({ ...prefs, breaking_alerts: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-200">Breaking News Alerts</span>
            <p className="text-xs text-gray-500">Instant email when big stories break</p>
          </div>
        </label>

        {/* Alert Categories */}
        {prefs.breaking_alerts && (
          <div className="ml-7">
            <p className="text-xs text-gray-400 mb-2">Alert me for these categories:</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    prefs.alert_categories.includes(cat)
                      ? "bg-red-600/20 text-red-400 border border-red-800/40"
                      : "bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 self-start px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
