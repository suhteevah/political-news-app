"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  totalUsers: number;
  proSubscribers: number;
  intelligenceSubscribers: number;
  newsletterSubscribers: number;
  eventCounts: Record<string, number>;
  last7Days: Record<string, number>;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="text-gray-500 py-4">Loading analytics...</div>;
  if (!data)
    return <div className="text-red-400 py-4">Failed to load analytics</div>;

  const mrr = (
    data.proSubscribers * 6.99 +
    data.intelligenceSubscribers * 19.99
  ).toFixed(2);

  const stats = [
    { label: "Total Users", value: data.totalUsers, color: "text-gray-100" },
    {
      label: "Pro Subscribers",
      value: data.proSubscribers,
      color: "text-red-400",
    },
    {
      label: "Intel Subscribers",
      value: data.intelligenceSubscribers,
      color: "text-yellow-400",
    },
    {
      label: "Newsletter Subs",
      value: data.newsletterSubscribers,
      color: "text-blue-400",
    },
    { label: "Est. MRR", value: `$${mrr}`, color: "text-green-400" },
  ];

  const eventLabels: Record<string, string> = {
    checkout_started: "Checkouts Started",
    subscription_created: "Subscriptions Created",
    daily_digest_sent: "Daily Digests Sent",
    weekly_newsletter_sent: "Weekly Newsletters Sent",
    intelligence_brief_sent: "Intelligence Briefs Sent",
    referral_completed: "Referrals Completed",
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Analytics</h2>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Event breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            All-Time Events
          </h3>
          <div className="space-y-2">
            {Object.entries(eventLabels).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-gray-200">
                  {data.eventCounts[key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Last 7 Days
          </h3>
          <div className="space-y-2">
            {Object.entries(eventLabels).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-gray-200">
                  {data.last7Days[key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
