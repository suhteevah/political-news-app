import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { CommentSection } from "@/components/comment-section";
import { notFound } from "next/navigation";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  return (
    <div>
      <PostCard post={post} />
      <CommentSection postId={post.id} />
    </div>
  );
}
