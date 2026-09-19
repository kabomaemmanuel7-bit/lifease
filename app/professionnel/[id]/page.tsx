"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type WorkerDetail = {
  id: string;
  metier: string;
  zone: string | null;
  status: "disponible" | "occupe" | "indisponible";
  rating: number;
  rating_count: number;
  experience_years: number;
  competences: string[];
  description: string | null;
  bio: string | null;
  full_name: string;
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  completed_at: string | null;
};

const statusLabel: Record<WorkerDetail["status"], string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  indisponible: "Indisponible",
};

const statusTone: Record<WorkerDetail["status"], "success" | "warning" | "neutral"> = {
  disponible: "success",
  occupe: "warning",
  indisponible: "neutral",
};

export default function ProfessionnelPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorker() {
      const { data: workerProfile } = await supabase
        .from("worker_profiles")
        .select(
          "id, metier, zone, status, rating, rating_count, experience_years, competences, description, bio"
        )
        .eq("id", params.id)
        .single();

      if (!workerProfile) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: portfolioData }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", params.id).single(),
        supabase
          .from("worker_portfolio")
          .select("id, title, description, image_url, completed_at")
          .eq("worker_id", params.id)
          .order("completed_at", { ascending: false }),
      ]);

      setWorker({
        ...workerProfile,
        full_name: profile?.full_name ?? "Professionnel",
      });
      setPortfolio(portfolioData ?? []);
      setLoading(false);
    }

    loadWorker();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  if (!worker) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Profil introuvable.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-wine-600 text-xl font-medium text-white">
            {worker.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-medium text-ink-900">{worker.full_name}</p>
            <p className="text-sm text-ink-600">{worker.metier}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-ink-900">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {worker.rating > 0 ? worker.rating.toFixed(1) : "Nouveau"}
            {worker.rating_count > 0 && (
              <span className="text-ink-600">({worker.rating_count} avis)</span>
            )}
          </span>
          <Badge tone={statusTone[worker.status]}>
            {statusLabel[worker.status]}
          </Badge>
        </div>

        {worker.zone && (
          <p className="mb-4 text-sm text-ink-600">
            Zone d'intervention : {worker.zone}
          </p>
        )}

        {worker.bio && (
          <div className="mb-5">
            <p className="mb-1 text-sm font-medium text-ink-600">Biographie</p>
            <p className="whitespace-pre-line text-sm text-ink-900">{worker.bio}</p>
          </div>
        )}

        {worker.competences.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-ink-600">Services proposés</p>
            <div className="flex flex-wrap gap-2">
              {worker.competences.map((c) => (
                <Badge key={c} tone="wine">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <p className="mb-1 text-sm font-medium text-ink-600">Expérience</p>
          <p className="text-sm text-ink-900">{worker.experience_years} ans</p>
        </div>

        {worker.description && (
          <div className="mb-6">
            <p className="mb-1 text-sm font-medium text-ink-600">À propos</p>
            <p className="text-sm text-ink-900">{worker.description}</p>
          </div>
        )}

        {portfolio.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-ink-600">Réalisations</p>
            <div className="flex flex-col gap-3">
              {portfolio.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-md border border-wine-100 bg-white">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-ink-900">{item.title}</p>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-ink-600">{item.description}</p>
                    )}
                    {item.completed_at && (
                      <p className="mt-1 text-xs text-ink-400">
                        {new Date(item.completed_at).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href={`/demande/${worker.id}`}>
          <Button className="w-full">Demander une intervention</Button>
        </Link>
      </div>
    </main>
  );
}
