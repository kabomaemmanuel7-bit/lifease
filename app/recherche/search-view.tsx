"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { getEffectiveStatus } from "@/lib/availability";

type WorkerResult = {
  id: string;
  metier: string;
  zone: string | null;
  status: "disponible" | "occupe" | "indisponible";
  availability_start: string | null;
  availability_end: string | null;
  rating: number;
  rating_count: number;
  experience_years: number;
  full_name: string;
};

const statusLabel: Record<WorkerResult["status"], string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  indisponible: "Indisponible",
};

const statusTone: Record<WorkerResult["status"], "success" | "warning" | "neutral"> = {
  disponible: "success",
  occupe: "warning",
  indisponible: "neutral",
};

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceSlug = searchParams.get("service");

  const [serviceName, setServiceName] = useState<string | null>(null);
  const [results, setResults] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);

      let serviceId: string | null = null;

      if (serviceSlug) {
        const { data: service } = await supabase
          .from("services")
          .select("id, name")
          .eq("slug", serviceSlug)
          .single();

        if (service) {
          serviceId = service.id;
          setServiceName(service.name);
        }
      } else {
        setServiceName(null);
      }

      let query = supabase
        .from("worker_profiles")
        .select(
          "id, metier, zone, status, availability_start, availability_end, rating, rating_count, experience_years"
        );

      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data: workers } = await query;

      if (!workers || workers.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const ids = workers.map((w) => w.id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);

      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name])
      );

      const merged: WorkerResult[] = workers.map((w) => ({
        ...w,
        full_name: nameById.get(w.id) ?? "Professionnel",
      }));

      // Pertinence : disponibilite effective d'abord, puis note, puis experience
      merged.sort((a, b) => {
        const aStatus = getEffectiveStatus(a.status, a.availability_start, a.availability_end);
        const bStatus = getEffectiveStatus(b.status, b.availability_start, b.availability_end);
        if (aStatus !== bStatus) {
          if (aStatus === "disponible") return -1;
          if (bStatus === "disponible") return 1;
        }
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.experience_years - a.experience_years;
      });

      setResults(merged);
      setLoading(false);
    }

    loadResults();
  }, [serviceSlug]);

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
          <h1 className="text-lg font-medium text-ink-900">
            {serviceName ?? "Tous les professionnels"}
          </h1>
        </div>

        {loading && <p className="text-sm text-ink-600">Chargement…</p>}

        {!loading && results.length === 0 && (
          <p className="text-sm text-ink-600">
            Aucun professionnel disponible à proximité.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {results.map((worker) => {
            const effectiveStatus = getEffectiveStatus(
              worker.status,
              worker.availability_start,
              worker.availability_end
            );
            return (
              <Link key={worker.id} href={`/professionnel/${worker.id}`}>
                <Card className="flex items-center gap-3 bg-white">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-wine-100" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {worker.full_name}
                    </p>
                    <p className="truncate text-xs text-ink-600">
                      {worker.metier}
                      {worker.zone ? ` · ${worker.zone}` : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone[effectiveStatus]}>
                    {statusLabel[effectiveStatus]}
                  </Badge>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
