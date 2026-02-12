import { createClient } from "@/lib/supabase/server";
import { ThreadCard } from "@/components/thread-card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ForumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: forum } = await supabase
    .from("forums")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!forum) notFound();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("*, user:profiles(*)")
    .eq("forum_id", forum.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{forum.name}</h1>
          <p className="text-sm text-gray-400 mt-1">{forum.description}</p>
        </div>
        <Link
          href={`/forums/${slug}/new`}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"
        >
          New Thread
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} forumSlug={slug} />
          ))
        ) : (
          <p className="text-center py-16 text-gray-500">
            No threads yet. Start the conversation!
          </p>
        )}
      </div>
    </>
  );
}
