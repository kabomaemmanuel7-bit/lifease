"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerQuickMenu } from "@/components/WorkerQuickMenu";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Stats = {
  total: number;
  en_attente: number;
  acceptee: number;
  terminee: number;
  rating: number;
  rating_count: number;
};

export default function TableauDeBordPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }

      const [{ data: workerProfile }, { data: requestRows }] = await Promise.all([
        supabase
          .from("worker_profiles")
          .select("rating, rating_count")
          .eq("id", session.user.id)
          .single(),
        supabase.from("requests").select("status").eq("worker_id", session.user.id),
      ]);

      const rows = requestRows ?? [];
      setStats({
        total: rows.length,
        en_attente: rows.filter((r) => r.status === "en_attente").length,
        acceptee: rows.filter((r) => r.status === "acceptee").length,
        terminee: rows.filter((r) => r.status === "terminee").length,
        rating: workerProfile?.rating ?? 0,
        rating_count: workerProfile?.rating_count ?? 0,
      });

      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading || !stats) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <WorkerQuickMenu />
          <h1 className="text-lg font-medium text-ink-900">Tableau de bord</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white text-center">
            <p className="text-2xl font-semibold text-wine-600">{stats.total}</p>
            <p className="text-xs text-ink-600">Demandes reçues</p>
          </Card>
          <Card className="bg-white text-center">
            <p className="text-2xl font-semibold text-wine-600">
              {stats.rating > 0 ? stats.rating.toFixed(1) : "—"} ★
            </p>
            <p className="text-xs text-ink-600">{stats.rating_count} avis</p>
          </Card>
          <Card className="bg-white text-center">
            <p className="text-2xl font-semibold text-wine-600">{stats.terminee}</p>
            <p className="text-xs text-ink-600">Missions terminées</p>
          </Card>
          <Card className="bg-white text-center">
            <p className="text-2xl font-semibold text-wine-600">{stats.en_attente}</p>
            <p className="text-xs text-ink-600">En attente</p>
          </Card>
        </div>
      </div>
    </main>
  );
}
