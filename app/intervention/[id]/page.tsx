"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InterventionCard } from "@/components/InterventionCard";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  worker_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  location: string | null;
  completed_at: string | null;
  worker_name: string;
};

export default function InterventionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<Item | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user.id ?? null);

      const { data } = await supabase
        .from("worker_portfolio")
        .select("id, worker_id, title, description, image_url, image_urls, video_url, location, completed_at")
        .eq("id", id)
        .single();

      if (data) {
        const { data: workerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.worker_id)
          .single();

        setItem({ ...data, worker_name: workerProfile?.full_name ?? "Professionnel" });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Intervention introuvable.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">Intervention</h1>
      </div>

      <InterventionCard
        id={item.id}
        title={item.title}
        description={item.description}
        imageUrls={item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : []}
        videoUrl={item.video_url}
        location={item.location}
        completedAt={item.completed_at}
        workerName={item.worker_name}
        isOwner={userId === item.worker_id}
      />
    </main>
  );
}
