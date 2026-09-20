"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type WorkerData = {
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

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
};

type Tab = "realisations" | "services" | "avis";

const statusLabel: Record<WorkerData["status"], string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  indisponible: "Indisponible",
};

const statusTone: Record<WorkerData["status"], "success" | "warning" | "neutral"> = {
  disponible: "success",
  occupe: "warning",
  indisponible: "neutral",
};

export function WorkerProfileView({
  workerId,
  variant,
}: {
  workerId: string;
  variant: "own" | "public";
}) {
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [tab, setTab] = useState<Tab>("realisations");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      const { data: workerProfile } = await supabase
        .from("worker_profiles")
        .select(
          "metier, zone, status, rating, rating_count, experience_years, competences, description, bio"
        )
        .eq("id", workerId)
        .single();

      if (!workerProfile) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: portfolioData }, { data: reviewRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", workerId).single(),
          supabase
            .from("worker_portfolio")
            .select("id, title, description, image_url, completed_at")
            .eq("worker_id", workerId)
            .order("completed_at", { ascending: false }),
          supabase
            .from("reviews")
            .select("id, rating, comment, created_at, client_id")
            .eq("worker_id", workerId)
            .order("created_at", { ascending: false }),
        ]);

      let reviewsWithNames: ReviewItem[] = [];
      if (reviewRows && reviewRows.length > 0) {
        const clientIds = reviewRows.map((r) => r.client_id);
        const { data: clientProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clientIds);
        const nameById = new Map(
          (clientProfiles ?? []).map((p) => [p.id, p.full_name])
        );
        reviewsWithNames = reviewRows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          client_name: nameById.get(r.client_id) ?? "Client",
        }));
      }

      setWorker({
        ...workerProfile,
        full_name: profile?.full_name ?? "Professionnel",
      });
      setPortfolio(portfolioData ?? []);
      setReviews(reviewsWithNames);
      setLoading(false);
    }

    loadAll();
  }, [workerId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  if (loading) {
    return <p className="text-sm text-ink-600">Chargement…</p>;
  }

  if (!worker) {
    return <p className="text-sm text-ink-600">Profil introuvable.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-wine-600 text-2xl font-medium text-white">
          {worker.full_name.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-medium text-ink-900">{worker.full_name}</p>
        <p className="text-sm text-ink-600">{worker.metier}</p>
      </div>

      <div className="mb-4 flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-ink-900">
            {worker.rating > 0 ? worker.rating.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-ink-600">Note</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-ink-900">{worker.rating_count}</p>
          <p className="text-xs text-ink-600">Avis</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-ink-900">{portfolio.length}</p>
          <p className="text-xs text-ink-600">Réalisations</p>
        </div>
      </div>

      <div className="mb-5 flex justify-center">
        <Badge tone={statusTone[worker.status]}>{statusLabel[worker.status]}</Badge>
      </div>

      {variant === "own" ? (
        <div className="mb-6 flex flex-col gap-2">
          <Link href="/travailleur/profil">
            <Button className="w-full">Modifier mon profil</Button>
          </Link>
          <Link href="/travailleur/demandes">
            <Button variant="secondary" className="w-full">
              Mes demandes
            </Button>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md border border-wine-200 py-3 text-sm font-medium text-wine-700"
          >
            Déconnexion
          </button>
        </div>
      ) : (
        <Link href={`/demande/${workerId}`}>
          <Button className="mb-6 w-full">Demander une intervention</Button>
        </Link>
      )}

      <div className="mb-4 flex border-b border-beige-200">
        {(
          [
            { id: "realisations", label: "Réalisations" },
            { id: "services", label: "Services" },
            { id: "avis", label: "Avis" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 pb-2 text-sm font-medium ${
              tab === t.id
                ? "border-wine-600 text-wine-600"
                : "border-transparent text-ink-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "realisations" && (
        <div className="flex flex-col gap-3">
          {portfolio.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucune réalisation publiée pour le moment.
            </p>
          )}
          {portfolio.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-md border border-wine-100 bg-white"
            >
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
      )}

      {tab === "services" && (
        <div>
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
            <div className="mb-5">
              <p className="mb-1 text-sm font-medium text-ink-600">À propos</p>
              <p className="text-sm text-ink-900">{worker.description}</p>
            </div>
          )}
        </div>
      )}

      {tab === "avis" && (
        <div className="flex flex-col gap-3">
          {reviews.length === 0 && (
            <p className="text-center text-sm text-ink-600">Aucun avis pour le moment.</p>
          )}
          {reviews.map((review) => (
            <div key={review.id} className="rounded-md border border-wine-100 bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">{review.client_name}</p>
                <span className="flex items-center gap-1 text-xs text-ink-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {review.rating}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-ink-600">{review.comment}</p>
              )}
              <p className="mt-1 text-xs text-ink-400">
                {new Date(review.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
