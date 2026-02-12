import { createClient } from "@/lib/supabase/server";
import { ForumCard } from "@/components/forum-card";

export default async function ForumsPage() {
  const supabase = await createClient();

  const { data: forums } = await supabase
    .from("forums")
    .select("*")
    .order("member_count", { ascending: false });

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Forums</h1>
      <div className="flex flex-col gap-3">
        {forums?.map((forum) => (
          <ForumCard key={forum.id} forum={forum} />
        ))}
      </div>
    </>
  );
}
