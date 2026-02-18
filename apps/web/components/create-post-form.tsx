"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function CreatePostForm() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // ── Shared: validate and add files from any source ──────────────
  const addFiles = useCallback(
    (incoming: File[]) => {
      setError(null);
      const remaining = MAX_IMAGES - files.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_IMAGES} images per post`);
        return;
      }

      const toAdd: File[] = [];
      for (const file of incoming.slice(0, remaining)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError("Only JPEG, PNG, GIF, and WebP images are allowed");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError("Images must be under 5 MB");
          continue;
        }
        toAdd.push(file);
      }

      if (toAdd.length > 0) {
        setFiles((prev) => [...prev, ...toAdd]);
        const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
        setPreviews((prev) => [...prev, ...newPreviews]);
      }
    },
    [files.length]
  );

  // ── File input handler ──────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Paste handler (Ctrl+V / Cmd+V into textarea) ───────────────
  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageFiles: File[] = [];

    for (const item of items) {
      if (item.kind === "file" && ALLOWED_TYPES.includes(item.type)) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault(); // don't paste the image as text/blob URL
      addFiles(imageFiles);
    }
    // if no images in clipboard, let default paste (text) happen
  }

  // ── Drag & drop handlers ────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (files.length < MAX_IMAGES) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (droppedFiles.length > 0) addFiles(droppedFiles);
  }

  // ── Remove image ────────────────────────────────────────────────
  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Upload images to Supabase Storage
      const mediaUrls: string[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("user-uploads")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setError("Failed to upload image. Please try again.");
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("user-uploads")
          .getPublicUrl(path);

        mediaUrls.push(urlData.publicUrl);
      }

      // Insert the post with media URLs
      const insertData: { user_id: string; content: string; media_urls?: string[] } = {
        user_id: user.id,
        content: content.trim(),
      };
      if (mediaUrls.length > 0) {
        insertData.media_urls = mediaUrls;
      }

      const { error: insertError } = await supabase
        .from("user_posts")
        .insert(insertData);

      if (insertError) {
        console.error("Insert error:", insertError);
        setError("Failed to create post. Please try again.");
        setLoading(false);
        return;
      }

      // Clean up
      previews.forEach((url) => URL.revokeObjectURL(url));
      setContent("");
      setFiles([]);
      setPreviews([]);
      setLoading(false);
      router.refresh();
    } catch (err) {
      console.error("Post submission error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border rounded-xl p-4 transition-colors ${
        dragOver
          ? "border-red-500 bg-red-950/10"
          : "border-gray-800"
      }`}
    >
      <textarea
        placeholder="What's on your mind? (paste or drop images here)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        rows={3}
        className="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none"
      />

      {/* Drag-over overlay hint */}
      {dragOver && (
        <div className="flex items-center justify-center py-4 text-sm text-red-400 border border-dashed border-red-500/50 rounded-lg mb-2">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
          Drop images here
        </div>
      )}

      {/* Image previews */}
      {previews.length > 0 && (
        <div className="mt-3 grid gap-2 grid-cols-2">
          {previews.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt=""
                className="rounded-lg w-full object-cover h-32"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_IMAGES || loading}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800/50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
            title={files.length >= MAX_IMAGES ? `Max ${MAX_IMAGES} images` : "Add images"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>

          {files.length > 0 && (
            <span className="text-xs text-gray-500">
              {files.length}/{MAX_IMAGES} images
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!content.trim() && files.length === 0)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
