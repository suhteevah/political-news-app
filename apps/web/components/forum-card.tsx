import Link from "next/link";

interface ForumData {
  id: string;
  name: string;
  slug: string;
  description: string;
  post_count: number;
  member_count: number;
}

export function ForumCard({ forum }: { forum: ForumData }) {
  return (
    <Link
      href={`/forums/${forum.slug}`}
      className="block border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
    >
      <h3 className="text-lg font-semibold">{forum.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{forum.description}</p>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span>{forum.member_count} members</span>
        <span>{forum.post_count} threads</span>
      </div>
    </Link>
  );
}
