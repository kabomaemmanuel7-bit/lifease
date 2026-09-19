"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

type WorkerResult = {
  id: string;
  metier: string;
  zone: string | null;
  status: "disponible" | "occupe" | "indisponible";
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
  const categorySlug = searchParams.get("service");

  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [results, setResults] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);

      let categoryId: string | null = null;

      if (categorySlug) {
        const { data: category } = await supabase
          .from("services")
          .select("id, name")
          .eq("slug", categorySlug)
          .single();

        if (category) {
          categoryId = category.id;
          setCategoryName(category.name);
        }
      } else {
        setCategoryName(null);
      }

      let query = supabase
        .from("worker_profiles")
        .select(
          "id, metier, zone, status, rating, rating_count, experience_years"
        );

      if (categoryId) {
        query = query.eq("service_id", categoryId);
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

      // Pertinence : disponibilité d'abord, puis note, puis expérience
      merged.sort((a, b) => {
        if (a.status !== b.status) {
          if (a.status === "disponible") return -1;
          if (b.status === "disponible") return 1;
        }
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.experience_years - a.experience_years;
      });

      setResults(merged);
      setLoading(false);
    }

    loadResults();
  }, [categorySlug]);

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">
          {categoryName ?? "Tous les professionnels"}
        </h1>
      </div>

      {loading && <p className="text-sm text-ink-600">Chargement…</p>}

      {!loading && results.length === 0 && (
        <p className="text-sm text-ink-600">
          Aucun professionnel disponible à proximité.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {results.map((worker) => (
          <Link key={worker.id} href={`/professionnel/${worker.id}`}>
            <Card className="flex items-center gap-3">
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
              <Badge tone={statusTone[worker.status]}>
                {statusLabel[worker.status]}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
