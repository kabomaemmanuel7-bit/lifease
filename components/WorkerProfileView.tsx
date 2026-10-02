"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { getEffectiveStatus } from "@/lib/availability";

type WorkerData = {
  metier: string;
  zone: string | null;
  status: "disponible" | "occupe" | "indisponible";
  availability_start: string | null;
  availability_end: string | null;
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
  created_at: string;
  location: string | null;
  video_url: string | null;
  image_urls: string[] | null;
  media_urls: string[] | null;
  intervention_date: string | null;
};

type PortfolioComment = {
  id: string;
  portfolio_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  client_name: string;
};

const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

function getMedia(item: PortfolioItem): { url: string; isVideo: boolean }[] {
  const urls: string[] = [];
  const add = (u: string | null | undefined) => {
    if (u && !urls.includes(u)) urls.push(u);
  };
  if (item.media_urls && item.media_urls.length > 0) {
    item.media_urls.forEach(add);
  } else if (item.image_urls && item.image_urls.length > 0) {
    item.image_urls.forEach(add);
  } else {
    add(item.image_url);
  }
  add(item.video_url);
  return urls.map((url) => ({ url, isVideo: VIDEO_RE.test(url) }));
}

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
};

type CvEntry = {
  id: string;
  type: "competence" | "diplome" | "experience" | "stage" | "formation";
  title: string;
  institution: string | null;
  period: string | null;
  description: string | null;
};

type Offering = {
  id: string;
  title: string;
  average_price: number | null;
  price_unit: string | null;
};

type Tab = "interventions" | "services" | "cv" | "avis";

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

const cvGroups: { type: CvEntry["type"]; label: string }[] = [
  { type: "diplome", label: "Diplômes" },
  { type: "formation", label: "Formations" },
  { type: "experience", label: "Expériences" },
  { type: "stage", label: "Stages" },
  { type: "competence", label: "Compétences" },
];

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
  const [cvEntries, setCvEntries] = useState<CvEntry[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [comments, setComments] = useState<PortfolioComment[]>([]);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>("interventions");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadAll() {
      const { data: workerProfile } = await supabase
        .from("worker_profiles")
        .select(
          "metier, zone, status, availability_start, availability_end, rating, rating_count, experience_years, competences, description, bio"
        )
        .eq("id", workerId)
        .single();

      if (!workerProfile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [
        { data: profile },
        { data: portfolioData },
        { data: reviewRows },
        { data: cvData },
        { data: offeringData },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", workerId).single(),
        supabase
          .from("worker_portfolio")
          .select(
            "id, title, description, image_url, completed_at, created_at, location, video_url, image_urls, media_urls, intervention_date"
          )
          .eq("worker_id", workerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at, client_id")
          .eq("worker_id", workerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("worker_cv_entries")
          .select("id, type, title, institution, period, description")
          .eq("worker_id", workerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("worker_offerings")
          .select("id, title, average_price, price_unit")
          .eq("worker_id", workerId)
          .order("created_at", { ascending: true }),
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

      let commentsWithNames: PortfolioComment[] = [];
      if (portfolioData && portfolioData.length > 0) {
        const { data: commentRows } = await supabase
          .from("portfolio_comments")
          .select("id, portfolio_id, client_id, rating, comment, created_at")
          .in(
            "portfolio_id",
            portfolioData.map((p) => p.id)
          )
          .order("created_at", { ascending: false });

        if (commentRows && commentRows.length > 0) {
          const ids = Array.from(new Set(commentRows.map((c) => c.client_id)));
          const { data: names } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          const byId = new Map((names ?? []).map((n) => [n.id, n.full_name]));
          commentsWithNames = commentRows.map((c) => ({
            id: c.id,
            portfolio_id: c.portfolio_id,
            rating: c.rating,
            comment: c.comment,
            created_at: c.created_at,
            client_name: byId.get(c.client_id) ?? "Client",
          }));
        }
      }

      setWorker({
        ...workerProfile,
        full_name: profile?.full_name ?? "Professionnel",
      });
      setPortfolio((portfolioData ?? []) as PortfolioItem[]);
      setComments(commentsWithNames);
      setReviews(reviewsWithNames);
      setCvEntries((cvData ?? []) as CvEntry[]);
      setOfferings((offeringData ?? []) as Offering[]);
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

  if (notFound) {
    if (variant === "own") {
      return (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="mb-2 text-base font-medium text-ink-900">
            Votre profil professionnel n'est pas encore configuré
          </p>
          <p className="mb-6 text-sm text-ink-600">
            Renseignez votre métier, vos compétences et votre zone
            d'intervention pour apparaître dans les recherches.
          </p>
          <Link href="/travailleur/profil" className="w-full">
            <Button className="w-full">Créer mon profil</Button>
          </Link>
          <button
            onClick={handleSignOut}
            className="mt-3 w-full rounded-md border border-wine-200 py-3 text-sm font-medium text-wine-700"
          >
            Déconnexion
          </button>
        </div>
      );
    }
    return <p className="text-sm text-ink-600">Profil introuvable.</p>;
  }

  if (!worker) {
    return <p className="text-sm text-ink-600">Profil introuvable.</p>;
  }

  const effectiveStatus = getEffectiveStatus(
    worker.status,
    worker.availability_start,
    worker.availability_end
  );

  const hasAbout =
    !!worker.bio || !!worker.description || worker.experience_years > 0;

  return (
    <div>
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-wine-600 text-2xl font-medium text-white">
          {worker.full_name.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-medium text-ink-900">{worker.full_name}</p>
        <p className="text-sm text-ink-600">{worker.metier}</p>
        {worker.zone && (
          <p className="mt-0.5 text-xs text-ink-400">{worker.zone}</p>
        )}
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
          <p className="text-xs text-ink-600">Interventions</p>
        </div>
      </div>

      <div className="mb-5 flex justify-center">
        <Badge tone={statusTone[effectiveStatus]}>{statusLabel[effectiveStatus]}</Badge>
      </div>

      {variant === "own" ? (
        <div className="mb-6 flex flex-col gap-2">
          <Link href="/travailleur/profil">
            <Button className="w-full">Modifier mon profil</Button>
          </Link>
          <Link href="/travailleur/cv">
            <Button variant="secondary" className="w-full">
              Modifier mon CV
            </Button>
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
            { id: "interventions", label: "Interventions" },
            { id: "services", label: "Services" },
            { id: "cv", label: "CV" },
            { id: "avis", label: "Avis" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 pb-2 text-xs font-medium ${
              tab === t.id
                ? "border-wine-600 text-wine-600"
                : "border-transparent text-ink-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "interventions" && (
        <div className="flex flex-col gap-4">
          {portfolio.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucune intervention publiée pour le moment.
            </p>
          )}
          {portfolio.map((item) => {
            const media = getMedia(item);
            const itemComments = comments.filter((c) => c.portfolio_id === item.id);
            const rawDate = item.intervention_date ?? item.completed_at ?? item.created_at;
            const isOpen = !!openComments[item.id];
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-md border border-wine-100 bg-white"
              >
                <div className="px-3 pt-3">
                  <p className="text-sm font-medium text-ink-900">{item.title}</p>
                  <p className="text-xs text-ink-400">
                    {new Date(rawDate).toLocaleDateString("fr-FR")}
                    {item.location ? ` – ${item.location}` : ""}
                  </p>
                </div>

                {media.length > 0 && (
                  <div className="mt-2 flex snap-x snap-mandatory gap-1 overflow-x-auto">
                    {media.map((m) =>
                      m.isVideo ? (
                        <video
                          key={m.url}
                          src={m.url}
                          controls
                          preload="metadata"
                          className="h-56 w-full shrink-0 snap-center bg-black object-cover"
                        />
                      ) : (
                        <img
                          key={m.url}
                          src={m.url}
                          alt={item.title}
                          className="h-56 w-full shrink-0 snap-center object-cover"
                        />
                      )
                    )}
                  </div>
                )}
                {media.length > 1 && (
                  <p className="px-3 pt-1 text-right text-xs text-ink-400">
                    {media.length} médias – faites glisser
                  </p>
                )}

                <div className="p-3">
                  {item.description && (
                    <p className="whitespace-pre-line text-sm text-ink-900">
                      {item.description}
                    </p>
                  )}
                  <button
                    onClick={() =>
                      setOpenComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="mt-2 text-xs font-medium text-wine-600"
                  >
                    {itemComments.length === 0
                      ? "Aucun avis sur cette intervention"
                      : `${isOpen ? "Masquer" : "Voir"} les avis (${itemComments.length})`}
                  </button>
                  {isOpen && itemComments.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                      {itemComments.map((c) => (
                        <div key={c.id} className="rounded-md bg-beige-50 p-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-ink-900">
                              {c.client_name}
                            </p>
                            {c.rating != null && (
                              <span className="flex items-center gap-1 text-xs text-ink-600">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {c.rating}
                              </span>
                            )}
                          </div>
                          {c.comment && (
                            <p className="mt-0.5 text-xs text-ink-600">{c.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab === "services" && (
        <div>
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-ink-600">Tarifs indicatifs</p>
            {offerings.length === 0 ? (
              <p className="text-sm text-ink-600">
                {variant === "own"
                  ? "Vous n'avez pas encore de services tarifés."
                  : "Aucun tarif renseigné pour le moment."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {offerings.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-wine-100 bg-white p-3"
                  >
                    <p className="text-sm font-medium text-ink-900">{o.title}</p>
                    <p className="text-sm text-wine-700">
                      {o.average_price != null
                        ? `${Number(o.average_price).toLocaleString("fr-FR")} FCFA`
                        : "Sur devis"}
                      {o.average_price != null && o.price_unit
                        ? ` / ${o.price_unit}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        </div>
      )}

      {tab === "cv" && (
        <div>
          {hasAbout && (
            <div className="mb-5">
              {worker.bio && (
                <div className="mb-4">
                  <p className="mb-1 text-sm font-medium text-ink-600">Biographie</p>
                  <p className="whitespace-pre-line text-sm text-ink-900">{worker.bio}</p>
                </div>
              )}
              {worker.description && (
                <div className="mb-4">
                  <p className="mb-1 text-sm font-medium text-ink-600">À propos</p>
                  <p className="text-sm text-ink-900">{worker.description}</p>
                </div>
              )}
              {worker.experience_years > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-ink-600">Expérience</p>
                  <p className="text-sm text-ink-900">{worker.experience_years} ans</p>
                </div>
              )}
            </div>
          )}

          {cvEntries.length === 0 && !hasAbout && (
            <p className="text-center text-sm text-ink-600">
              Aucun élément de CV renseigné pour le moment.
            </p>
          )}

          {cvGroups.map((group) => {
            const items = cvEntries.filter((e) => e.type === group.type);
            if (items.length === 0) return null;
            return (
              <div key={group.type} className="mb-5">
                <p className="mb-2 text-sm font-medium text-ink-600">{group.label}</p>
                <div className="flex flex-col gap-2">
                  {items.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-wine-100 bg-white p-3"
                    >
                      <p className="text-sm font-medium text-ink-900">{entry.title}</p>
                      {entry.institution && (
                        <p className="text-xs text-ink-600">{entry.institution}</p>
                      )}
                      {entry.period && (
                        <p className="text-xs text-ink-400">{entry.period}</p>
                      )}
                      {entry.description && (
                        <p className="mt-1 text-xs text-ink-600">{entry.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
