"use client";

import { CATEGORIES } from "@repo/shared";
import { useRouter, useSearchParams } from "next/navigation";

export function CategoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "all";

  function handleClick(category: string) {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => handleClick("all")}
        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
          active === "all"
            ? "bg-red-600 text-white"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            active === cat
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
