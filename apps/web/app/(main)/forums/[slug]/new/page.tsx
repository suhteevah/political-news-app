import { createClient } from "@/lib/supabase/server";
import { CreateThreadForm } from "@/components/create-thread-form";
import { notFound } from "next/navigation";

export default async function NewThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: forum } = await supabase
    .from("forums")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!forum) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">
        New Thread in {forum.name}
      </h1>
      <CreateThreadForm forumId={forum.id} forumSlug={forum.slug} />
    </>
  );
}
