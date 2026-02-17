"use client";

import { useState } from "react";
import type { UserPlan } from "@/lib/get-user-plan";
import { events } from "@/lib/analytics";

const CHECK = (
  <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const DASH = (
  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
  </svg>
);

const FREE_FEATURES = [
  "Full curated news feed (32+ sources)",
  "Community posts & forums",
  "Comments & voting",
  "Embed-friendly link sharing",
  "User profiles & following",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Breaking news alerts",
  "Custom feed curation",
  "Daily digest email (7am EST)",
  "Wire Pro badge",
  "Priority support",
];

const INTELLIGENCE_FEATURES = [
  "Everything in Wire Pro",
  "Intelligence Brief (daily PDF reports)",
  "Enhanced highlight export (scripts & show notes)",
  "Keyword topic alerts",
  "Trend dashboard & analytics",
  "Data API access",
];

export function PricingCards({
  currentPlan,
  isLoggedIn,
}: {
  currentPlan: UserPlan;
  isLoggedIn: boolean;
}) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(plan: "pro" | "intelligence") {
    if (!isLoggedIn) {
      window.location.href = "/signup";
      return;
    }
    setLoading(plan);
    events.checkoutStarted(plan);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingPeriod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        console.error("Checkout error:", data.error);
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-900 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "yearly"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Yearly <span className="text-green-400 text-xs ml-1">Save 28%</span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Free Tier */}
        <div className="border border-gray-800 rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold">The Wire</h3>
          <p className="text-gray-500 text-sm mt-1">Free forever</p>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-gray-500 text-sm">/month</span>
          </div>
          {currentPlan === "free" ? (
            <div className="py-2.5 px-4 text-center text-sm text-gray-500 border border-gray-700 rounded-lg">
              Current Plan
            </div>
          ) : (
            <div className="py-2.5 px-4 text-center text-sm text-gray-500 border border-gray-800 rounded-lg">
              Included
            </div>
          )}
          <ul className="mt-6 space-y-3 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                {CHECK}
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Tier */}
        <div className="border-2 border-red-600 rounded-2xl p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </div>
          <h3 className="text-lg font-semibold">Wire Pro</h3>
          <p className="text-gray-500 text-sm mt-1">For news junkies</p>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold">
              {billingPeriod === "monthly" ? "$6.99" : "$4.99"}
            </span>
            <span className="text-gray-500 text-sm">/month</span>
            {billingPeriod === "yearly" && (
              <span className="block text-xs text-gray-500 mt-1">$59.99 billed annually</span>
            )}
          </div>
          {currentPlan === "pro" ? (
            <button
              onClick={handleManage}
              disabled={loading === "manage"}
              className="py-2.5 px-4 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading === "manage" ? "Loading..." : "Manage Subscription"}
            </button>
          ) : currentPlan === "intelligence" ? (
            <div className="py-2.5 px-4 text-center text-sm text-gray-500 border border-gray-800 rounded-lg">
              Included in Intelligence
            </div>
          ) : (
            <button
              onClick={() => handleSubscribe("pro")}
              disabled={loading === "pro"}
              className="py-2.5 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === "pro" ? "Loading..." : "Subscribe to Pro"}
            </button>
          )}
          <ul className="mt-6 space-y-3 flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                {CHECK}
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Intelligence Tier */}
        <div className="border border-gray-800 rounded-2xl p-6 flex flex-col bg-gray-900/50">
          <h3 className="text-lg font-semibold">Wire Intelligence</h3>
          <p className="text-gray-500 text-sm mt-1">For creators & power users</p>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold">$19.99</span>
            <span className="text-gray-500 text-sm">/month</span>
          </div>
          {currentPlan === "intelligence" ? (
            <button
              onClick={handleManage}
              disabled={loading === "manage"}
              className="py-2.5 px-4 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading === "manage" ? "Loading..." : "Manage Subscription"}
            </button>
          ) : (
            <button
              onClick={() => handleSubscribe("intelligence")}
              disabled={loading === "intelligence"}
              className="py-2.5 px-4 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === "intelligence" ? "Loading..." : "Subscribe to Intelligence"}
            </button>
          )}
          <ul className="mt-6 space-y-3 flex-1">
            {INTELLIGENCE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                {CHECK}
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
