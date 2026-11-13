"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { AvatarUploader } from "@/components/AvatarUploader";
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
  avatar_url: string | null;
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
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  const [mediaBusyId, setMediaBusyId] = useState<string | null>(null);
  const [mediaMsg, setMediaMsg] = useState<{ id: string; text: string } | null>(null);

  async function saveMedia(itemId: string, list: { url: string; isVideo: boolean }[]) {
    const images = list.filter((m) => !m.isVideo).map((m) => m.url);
    const video = list.find((m) => m.isVideo)?.url ?? null;
    const { data, error } = await supabase.from("worker_portfolio").update({ media_urls: list.map((m) => m.url), image_urls: images, image_url: images[0] ?? null, video_url: video }).eq("id", itemId).select("id");
    if (error || !data || data.length === 0) return false;
    setPortfolio((prev) => prev.map((p) => (p.id === itemId ? { ...p, media_urls: list.map((m) => m.url), image_urls: images, video_url: video } : p)));
    return true;
  }

  async function addMedia(item: PortfolioItem, picked: File[]) {
    if (picked.length === 0) return;
    setMediaMsg(null);
    const tooBig = picked.find((f) => f.size > 40 * 1024 * 1024);
    if (tooBig) { setMediaMsg({ id: item.id, text: `"${tooBig.name}" dépasse 40 Mo.` }); return; }
    const current = getMedia(item).map((m) => ({ url: m.url, isVideo: m.isVideo }));
    if (current.length + picked.length > 20) { setMediaMsg({ id: item.id, text: "Maximum 20 fichiers par intervention." }); return; }
    setMediaBusyId(item.id);
    const added: { url: string; isVideo: boolean }[] = [];
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      const path = `${workerId}/${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upError } = await supabase.storage.from("interventions").upload(path, file, { contentType: file.type });
      if (upError) { setMediaMsg({ id: item.id, text: `Échec de l'envoi de "${file.name}".` }); break; }
      const { data: pub } = supabase.storage.from("interventions").getPublicUrl(path);
      added.push({ url: pub.publicUrl, isVideo: file.type.startsWith("video/") });
    }
    if (added.length > 0) {
      const ok = await saveMedia(item.id, [...current, ...added]);
      if (!ok) setMediaMsg({ id: item.id, text: "Fichiers envoyés mais l'intervention n'a pas pu être mise à jour." });
    }
    setMediaBusyId(null);
  }

  async function removeMedia(item: PortfolioItem, url: string) {
    const current = getMedia(item).map((m) => ({ url: m.url, isVideo: m.isVideo }));
    if (current.length <= 1) { setMediaMsg({ id: item.id, text: "Une intervention doit garder au moins un fichier. Supprime plutôt l'intervention." }); return; }
    if (!window.confirm("Retirer ce fichier de l'intervention ?")) return;
    setMediaMsg(null);
    setMediaBusyId(item.id);
    const ok = await saveMedia(item.id, current.filter((m) => m.url !== url));
    setMediaBusyId(null);
    if (!ok) { setMediaMsg({ id: item.id, text: "Suppression du fichier impossible (droits manquants)." }); return; }
    const marker = "/interventions/";
    const idx = url.indexOf(marker);
    if (idx >= 0) await supabase.storage.from("interventions").remove([decodeURIComponent(url.slice(idx + marker.length))]);
  }

  const [menuId, setMenuId] = useState<string | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({});

  useEffect(() => {
    if (portfolio.length === 0) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id ?? null;
      const { data } = await supabase.from("intervention_likes").select("portfolio_id, user_id").in("portfolio_id", portfolio.map((p) => p.id));
      const next: Record<string, { count: number; mine: boolean }> = {};
      (data ?? []).forEach((r) => {
        const k = r.portfolio_id as string;
        const cur = next[k] ?? { count: 0, mine: false };
        next[k] = { count: cur.count + 1, mine: cur.mine || r.user_id === uid };
      });
      setLikes(next);
    })();
  }, [portfolio]);

  async function toggleLike(itemId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;
    const cur = likes[itemId] ?? { count: 0, mine: false };
    if (cur.mine) {
      await supabase.from("intervention_likes").delete().eq("portfolio_id", itemId).eq("user_id", uid);
      setLikes((p) => ({ ...p, [itemId]: { count: Math.max(0, cur.count - 1), mine: false } }));
    } else {
      await supabase.from("intervention_likes").insert({ portfolio_id: itemId, user_id: uid });
      setLikes((p) => ({ ...p, [itemId]: { count: cur.count + 1, mine: true } }));
    }
  }

  async function shareProfile() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url });
      else { await navigator.clipboard.writeText(url); alert("Lien copié"); }
    } catch {}
  }

  async function deleteItem(itemId: string) {
    setDeletingId(itemId);
    setDelError(null);
    const { data, error } = await supabase.from("worker_portfolio").delete().eq("id", itemId).select("id");
    setDeletingId(null);
    if (error || !data || data.length === 0) {
      setDelError(error ? "Suppression impossible : " + error.message : "Suppression refusée (droits manquants).");
      return;
    }
    setPortfolio((prev) => prev.filter((p) => p.id !== itemId));
    setConfirmDelId(null);
  }
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
        supabase.from("profiles").select("full_name, avatar_url").eq("id", workerId).single(),
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
        avatar_url: profile?.avatar_url ?? null,
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
        <AvatarUploader userId={workerId} name={worker.full_name} editable={variant === "own"} />
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
          <Link href="/travailleur/services">
            <Button variant="secondary" className="w-full">
              Mes services tarifés
            </Button>
          </Link>
          <Link href="/travailleur/demandes">
            <Button variant="secondary" className="w-full">
              Mes demandes
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          <Link href={`/demande/${workerId}`}>
            <Button className="w-full">Demander une intervention</Button>
          </Link>
        </div>
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
          {variant === "own" && (
            <Link href="/travailleur/interventions" className="flex items-center justify-center rounded-md bg-wine-700 py-3 text-sm font-semibold text-white">+ Publier photos ou vidéos</Link>
          )}
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
                className="overflow-hidden rounded-xl border border-wine-100 bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 px-3 pt-3">
                  {worker.avatar_url ? (
                    <img src={worker.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine-700 text-sm font-semibold text-white">{(worker.full_name ?? "?").charAt(0).toUpperCase()}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{worker.full_name}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(rawDate).toLocaleDateString("fr-FR")}
                      {item.location ? ` · 📍 ${item.location}` : ""}
                    </p>
                  </div>
                  {variant === "own" && (
                    <div className="relative">
                      <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} aria-label="Options" className="px-2 text-xl leading-none text-ink-600">⋯</button>
                      {menuId === item.id && (
                        <div className="absolute right-0 top-7 z-10 w-60 overflow-hidden rounded-lg border border-wine-100 bg-white text-sm shadow-lg">
                          <label className="block cursor-pointer px-4 py-3 text-ink-900">
                            Ajouter des photos ou vidéos
                            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; setMenuId(null); addMedia(item, f); }} />
                          </label>
                          <button onClick={() => { setManageId(item.id); setMenuId(null); }} className="block w-full px-4 py-3 text-left text-ink-900">Gérer les fichiers</button>
                          <button onClick={() => { setConfirmDelId(item.id); setDelError(null); setMenuId(null); }} className="block w-full px-4 py-3 text-left text-red-600">Supprimer la publication</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-3 pt-3">
                  <p className="text-base font-semibold text-ink-900">{item.title}</p>
                  {item.description && <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{item.description}</p>}
                </div>
                {media.length > 0 && (
                  <div className="mt-2 flex snap-x snap-mandatory gap-1 overflow-x-auto">
                    {media.map((m) =>
                      m.isVideo ? (
                        <video key={m.url} src={m.url} controls preload="metadata" className="h-56 w-full shrink-0 snap-center bg-black object-cover" />
                      ) : (
                        <img key={m.url} src={m.url} alt={item.title} className="h-56 w-full shrink-0 snap-center object-cover" />
                      )
                    )}
                  </div>
                )}
                {media.length > 1 && <p className="px-3 pt-1 text-right text-xs text-ink-400">{media.length} médias – faites glisser</p>}
                {mediaBusyId === item.id && <p className="px-3 pt-2 text-xs text-ink-400">Envoi en cours…</p>}
                {variant === "own" && mediaMsg && mediaMsg.id === item.id && <p className="px-3 pt-2 text-xs text-red-600">{mediaMsg.text}</p>}
                {variant === "own" && manageId === item.id && (
                  <div className="px-3 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {media.map((m) => (
                        <div key={m.url} className="relative h-16 w-16 overflow-hidden rounded-md bg-black">
                          {m.isVideo ? <video src={m.url} preload="metadata" muted className="h-full w-full object-cover" /> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                          <button onClick={() => removeMedia(item, m.url)} disabled={mediaBusyId === item.id} aria-label="Retirer ce fichier" className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white">✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setManageId(null)} className="mt-2 rounded-md border border-wine-200 px-3 py-1.5 text-xs font-medium text-wine-700">Terminé</button>
                  </div>
                )}
                {variant === "own" && confirmDelId === item.id && (
                  <div className="px-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-ink-600">Supprimer cette intervention ?</span>
                      <button onClick={() => deleteItem(item.id)} disabled={deletingId === item.id} className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white">{deletingId === item.id ? "Suppression…" : "Oui, supprimer"}</button>
                      <button onClick={() => setConfirmDelId(null)} className="rounded-md border border-wine-200 px-3 py-1.5 font-medium text-wine-700">Annuler</button>
                    </div>
                    {delError && <p className="mt-1 text-xs text-red-600">{delError}</p>}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between px-3 text-xs text-ink-400">
                  <span>{likes[item.id]?.count ? `👍 ${likes[item.id].count}` : ""}</span>
                  <span>{itemComments.length > 0 ? `${itemComments.length} avis` : ""}</span>
                </div>
                <div className="mx-3 mt-2 grid grid-cols-3 border-t border-wine-100 text-sm font-medium text-ink-600">
                  <button onClick={() => toggleLike(item.id)} className={"py-2.5 " + (likes[item.id]?.mine ? "text-wine-700" : "")}>👍 J'aime</button>
                  <button onClick={() => setOpenComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} className="py-2.5">💬 Avis</button>
                  <button onClick={shareProfile} className="py-2.5">↗ Partager</button>
                </div>
                {isOpen && (
                  <div className="px-3 pb-3">
                    {itemComments.length === 0 ? (
                      <p className="pt-2 text-xs text-ink-400">Aucun avis sur cette intervention.</p>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        {itemComments.map((c) => (
                          <div key={c.id} className="rounded-md bg-beige-50 p-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-ink-900">{c.client_name}</p>
                              {c.rating != null && (
                                <span className="flex items-center gap-1 text-xs text-ink-600">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {c.rating}
                                </span>
                              )}
                            </div>
                            {c.comment && <p className="mt-0.5 text-xs text-ink-600">{c.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="h-3" />
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
