"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InterventionComposer } from "@/components/InterventionComposer";
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
  video_url: string | null;
  location: string | null;
  completed_at: string | null;
};

type CvEntry = {
  id: string;
  type: "competence" | "diplome" | "experience" | "stage" | "formation";
  title: string;
  institution: string | null;
  period: string | null;
  description: string | null;
};

type ServiceItem = {
  id: string;
  title: string;
  price: number;
  description: string | null;
};

type Tab = "cv" | "services" | "interventions";

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

const cvSectionLabel: Record<CvEntry["type"], string> = {
  diplome: "Diplômes",
  formation: "Formations",
  experience: "Expériences",
  stage: "Stages",
  competence: "Compétences",
};

const cvSectionOrder: CvEntry["type"][] = [
  "diplome",
  "formation",
  "experience",
  "stage",
  "competence",
];

export function WorkerProfileView({
  workerId,
  variant,
}: {
  workerId: string;
  variant: "own" | "public";
}) {
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cvEntries, setCvEntries] = useState<CvEntry[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [tab, setTab] = useState<Tab>("cv");
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

      const [{ data: profile }, { data: portfolioData }, { data: cvRows }, { data: serviceRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", workerId).single(),
          supabase
            .from("worker_portfolio")
            .select("id, title, description, image_url, video_url, location, completed_at")
            .eq("worker_id", workerId)
            .order("completed_at", { ascending: false }),
          supabase
            .from("worker_cv_entries")
            .select("id, type, title, institution, period, description")
            .eq("worker_id", workerId)
            .order("created_at", { ascending: false }),
          supabase
            .from("worker_services")
            .select("id, title, price, description")
            .eq("worker_id", workerId)
            .order("created_at", { ascending: false }),
        ]);

      setWorker({
        ...workerProfile,
        full_name: profile?.full_name ?? "Professionnel",
      });
      setPortfolio(portfolioData ?? []);
      setCvEntries(cvRows ?? []);
      setServices(serviceRows ?? []);
      setLoading(false);
    }

    loadAll();
  }, [workerId]);

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
          <p className="text-xs text-ink-600">Interventions</p>
        </div>
      </div>

      <div className="mb-5 flex justify-center">
        <Badge tone={statusTone[worker.status]}>{statusLabel[worker.status]}</Badge>
      </div>

      {variant === "public" && (
        <Link href={`/demande/${workerId}`}>
          <Button className="mb-6 w-full">Demander une intervention</Button>
        </Link>
      )}

      <div className="mb-4 flex border-b border-beige-200">
        {(
          [
            { id: "cv", label: "CV" },
            { id: "services", label: "Services" },
            { id: "interventions", label: "Interventions" },
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

      {tab === "cv" && (
        <div className="flex flex-col gap-5">
          {variant === "own" && (
            <Link href="/travailleur/cv">
              <Button variant="secondary" className="w-full">
                Modifier mon CV
              </Button>
            </Link>
          )}
          {cvEntries.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucune information de CV renseignée pour le moment.
            </p>
          )}
          {cvSectionOrder.map((sectionType) => {
            const items = cvEntries.filter((e) => e.type === sectionType);
            if (items.length === 0) return null;
            return (
              <div key={sectionType}>
                <p className="mb-2 text-sm font-medium text-ink-600">
                  {cvSectionLabel[sectionType]}
                </p>
                {sectionType === "competence" ? (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <Badge key={item.id} tone="wine">
                        {item.title}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border border-wine-100 bg-white p-3"
                      >
                        <p className="text-sm font-medium text-ink-900">{item.title}</p>
                        {item.institution && (
                          <p className="text-xs text-ink-600">{item.institution}</p>
                        )}
                        {item.period && (
                          <p className="text-xs text-ink-400">{item.period}</p>
                        )}
                        {item.description && (
                          <p className="mt-1 text-xs text-ink-600">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "services" && (
        <div className="flex flex-col gap-3">
          {variant === "own" && (
            <Link href="/travailleur/services">
              <Button variant="secondary" className="w-full">
                Gérer mes services
              </Button>
            </Link>
          )}
          {services.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucun service renseigné pour le moment.
            </p>
          )}
          {services.map((s) => (
            <div key={s.id} className="rounded-md border border-wine-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">{s.title}</p>
                <p className="text-sm font-medium text-wine-600">
                  {s.price.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              {s.description && (
                <p className="mt-1 text-xs text-ink-600">{s.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "interventions" && (
        <div className="flex flex-col gap-3">
          {variant === "own" && (
            <InterventionComposer
              workerId={workerId}
              onPublished={(item) => setPortfolio((prev) => [item, ...prev])}
            />
          )}
          {portfolio.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucune intervention publiée pour le moment.
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
              {item.video_url && (
                <video src={item.video_url} controls className="h-40 w-full object-cover" />
              )}
              <div className="p-3">
                <p className="text-sm font-medium text-ink-900">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-ink-600">{item.description}</p>
                )}
                {item.location && (
                  <p className="mt-1 text-xs text-ink-600">📍 {item.location}</p>
                )}
                {item.completed_at && (
                  <p className="mt-1 text-xs text-ink-400">
                    {new Date(item.completed_at).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
