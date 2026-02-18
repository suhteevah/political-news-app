export function WireBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const sizeClasses =
    size === "md"
      ? "px-2.5 py-1 text-sm gap-1.5"
      : "px-1.5 py-0.5 text-xs gap-1";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border border-amber-700/40 bg-amber-950/30 text-amber-400 ${sizeClasses}`}
    >
      <span>⚡</span>
      <span>WIRE</span>
    </span>
  );
}
