"use client";

import { useState } from "react";

const PRESETS = [5, 10, 25];

export function SupportWireButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(10);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDonate() {
    const donateAmount = custom ? Number(custom) : amount;
    if (!donateAmount || donateAmount < 1) return;
    setLoading(true);

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: donateAmount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-800/40 bg-red-950/10 text-red-400 hover:bg-red-950/20 transition-colors text-sm font-medium"
      >
        <span>❤️</span>
        Support The Wire
      </button>
    );
  }

  return (
    <div className="border border-red-800/40 rounded-xl p-5 bg-red-950/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Support The Wire</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300">✕</button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        The Right Wire is 100% ad-free. Your tips keep us running and independent.
      </p>

      {/* Preset amounts */}
      <div className="flex gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => { setAmount(p); setCustom(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              amount === p && !custom
                ? "border-red-500 bg-red-600/20 text-red-400"
                : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-400">$</span>
        <input
          type="number"
          min="1"
          max="500"
          placeholder="Custom amount"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setAmount(""); }}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-red-700"
        />
      </div>

      <button
        onClick={handleDonate}
        disabled={loading || (!amount && !custom)}
        className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Redirecting..." : `Tip $${custom || amount || 0}`}
      </button>
      <p className="text-xs text-gray-600 mt-2 text-center">
        Powered by Stripe. Secure one-time payment.
      </p>
    </div>
  );
}
