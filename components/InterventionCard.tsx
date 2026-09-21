"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { InterventionCarousel } from "@/components/InterventionCarousel";
import { supabase } from "@/lib/supabase";

type Comment = {
  id: string;
  comment: string;
  created_at: string;
  author_name: string;
};

export function InterventionCard({
  id,
  title,
  description,
  imageUrls,
  videoUrl,
  location,
  completedAt,
  workerName,
}: {
  id: string;
  title: string;
  description: string | null;
  imageUrls: string[];
  videoUrl: string | null;
  location: string | null;
  completedAt: string | null;
  workerName?: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user.id ?? null;
      setUserId(uid);

      const { data: likeRows } = await supabase
        .from("intervention_likes")
        .select("user_id")
        .eq("portfolio_id", id);

      setLikeCount(likeRows?.length ?? 0);
      setLiked(!!likeRows?.some((r) => r.user_id === uid));

      const { data: commentRows } = await supabase
        .from("intervention_comments")
        .select("id, comment, created_at, user_id")
        .eq("portfolio_id", id)
        .order("created_at", { ascending: true });

      if (commentRows && commentRows.length > 0) {
        const authorIds = [...new Set(commentRows.map((c) => c.user_id))];
        const { data: authorProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        const nameById = new Map((authorProfiles ?? []).map((p) => [p.id, p.full_name]));
        setComments(
          commentRows.map((c) => ({
            id: c.id,
            comment: c.comment,
            created_at: c.created_at,
            author_name: nameById.get(c.user_id) ?? "Utilisateur",
          }))
        );
      }
    }
    load();
  }, [id]);

  async function toggleLike() {
    if (!userId) return;
    if (liked) {
      await supabase
        .from("intervention_likes")
        .delete()
        .eq("portfolio_id", id)
        .eq("user_id", userId);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("intervention_likes").insert({ portfolio_id: id, user_id: userId });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !commentText.trim()) return;

    setSending(true);
    const { data, error } = await supabase
      .from("intervention_comments")
      .insert({ portfolio_id: id, user_id: userId, comment: commentText.trim() })
      .select("id, comment, created_at")
      .single();
    setSending(false);

    if (!error && data) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session?.user.id)
        .single();

      setComments((prev) => [
        ...prev,
        { ...data, author_name: myProfile?.full_name ?? "Vous" },
      ]);
      setCommentText("");
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-wine-100 bg-white">
      <InterventionCarousel imageUrls={imageUrls} videoUrl={videoUrl} />
      <div className="p-3">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        {workerName && <p className="text-xs text-ink-600">{workerName}</p>}
        {description && <p className="mt-0.5 text-xs text-ink-600">{description}</p>}
        {location && <p className="mt-1 text-xs text-ink-600">📍 {location}</p>}
        {completedAt && (
          <p className="mt-1 text-xs text-ink-400">
            {new Date(completedAt).toLocaleDateString("fr-FR")}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 border-t border-beige-100 pt-2">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1 text-xs text-ink-600"
            aria-label="Aimer"
          >
            <Heart
              className={`h-4 w-4 ${liked ? "fill-wine-600 text-wine-600" : "text-ink-600"}`}
            />
            {likeCount > 0 ? likeCount : ""}
          </button>
          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1 text-xs text-ink-600"
            aria-label="Commentaires"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 ? comments.length : ""}
          </button>
        </div>

        {showComments && (
          <div className="mt-2 flex flex-col gap-2">
            {comments.map((c) => (
              <div key={c.id} className="rounded-md bg-beige-50 px-3 py-2">
                <p className="text-xs font-medium text-ink-900">{c.author_name}</p>
                <p className="text-xs text-ink-600">{c.comment}</p>
              </div>
            ))}
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Écrire un commentaire…"
                className="flex-1 rounded-full border border-wine-100 bg-white px-3 py-2 text-xs text-ink-900 focus:border-wine-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending}
                aria-label="Envoyer"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wine-600 text-white"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
