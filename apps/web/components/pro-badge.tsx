export function ProBadge({ plan }: { plan: "pro" | "intelligence" }) {
  if (plan === "intelligence") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-bold rounded-full border border-yellow-700/40 bg-yellow-950/30 text-yellow-400 gap-1">
        <span>🔱</span>
        <span>INTEL</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-bold rounded-full border border-red-700/40 bg-red-950/30 text-red-400 gap-1">
      <span>⚡</span>
      <span>PRO</span>
    </span>
  );
}
