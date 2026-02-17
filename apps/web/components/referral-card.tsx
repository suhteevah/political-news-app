"use client";

import { useState, useEffect } from "react";

export function ReferralCard() {
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    referralLink: string;
    totalReferrals: number;
    completedReferrals: number;
    referralProDaysLeft: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setReferralData)
      .catch(() => {});
  }, []);

  if (!referralData) return null;

  function handleCopy() {
    if (!referralData) return;
    navigator.clipboard.writeText(referralData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gradient-to-r from-red-950/30 to-gray-900/50 border border-red-800/20 rounded-xl p-5">
      <h3 className="text-base font-bold text-white mb-1">
        🇺🇸 Invite a Patriot — Get Free Pro
      </h3>
      <p className="text-gray-400 text-sm mb-4">
        Every friend who signs up gives you <span className="text-red-400 font-semibold">7 days of Wire Pro free</span>.
        No card needed. Refer more friends, stack more days.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          readOnly
          value={referralData.referralLink}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 truncate"
        />
        <button
          onClick={handleCopy}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-2xl font-bold text-white">{referralData.completedReferrals}</span>
          <span className="text-gray-500 ml-1">friends joined</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-white">{referralData.completedReferrals * 7}</span>
          <span className="text-gray-500 ml-1">days earned</span>
        </div>
        {referralData.referralProDaysLeft > 0 && (
          <div>
            <span className="text-2xl font-bold text-green-400">{referralData.referralProDaysLeft}</span>
            <span className="text-gray-500 ml-1">days left</span>
          </div>
        )}
      </div>

      {referralData.referralProDaysLeft > 0 && (
        <div className="mt-3 text-xs text-green-400/80 bg-green-950/30 border border-green-800/20 rounded-lg px-3 py-2">
          ✅ Wire Pro active — {referralData.referralProDaysLeft} day{referralData.referralProDaysLeft !== 1 ? "s" : ""} remaining from referrals
        </div>
      )}

      {referralData.referralProDaysLeft === 0 && referralData.completedReferrals > 0 && (
        <div className="mt-3 text-xs text-gray-400 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2">
          Your referral Pro time has expired. Refer another friend to get 7 more days!
        </div>
      )}
    </div>
  );
}
