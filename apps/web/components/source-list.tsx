interface Source {
  id: string;
  x_handle: string;
  display_name: string;
  category: string;
  is_active: boolean;
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-col gap-2">
      {sources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between border border-gray-800 rounded-lg p-3"
        >
          <div>
            <span className="font-semibold">@{source.x_handle}</span>
            <span className="ml-2 text-sm text-gray-400">
              {source.display_name}
            </span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
              {source.category}
            </span>
          </div>
          <span
            className={`text-xs font-semibold ${
              source.is_active ? "text-green-400" : "text-gray-500"
            }`}
          >
            {source.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      ))}
    </div>
  );
}
