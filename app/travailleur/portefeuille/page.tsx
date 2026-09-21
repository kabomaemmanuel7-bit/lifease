"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerQuickMenu } from "@/components/WorkerQuickMenu";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Transaction = {
  id: string;
  amount: number;
  commission: number;
  worker_amount: number;
  status: "en_attente" | "paye" | "echoue";
  created_at: string;
};

export default function PortefeuillePage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

      const { data: requestRows } = await supabase
        .from("requests")
        .select("id")
        .eq("worker_id", session.user.id);

      const requestIds = (requestRows ?? []).map((r) => r.id);

      if (requestIds.length > 0) {
        const { data: txData } = await supabase
          .from("transactions")
          .select("id, amount, commission, worker_amount, status, created_at, request_id")
          .in("request_id", requestIds)
          .order("created_at", { ascending: false });
        setTransactions(txData ?? []);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const totalPaye = transactions
    .filter((t) => t.status === "paye")
    .reduce((sum, t) => sum + t.worker_amount, 0);
  const totalEnAttente = transactions
    .filter((t) => t.status === "en_attente")
    .reduce((sum, t) => sum + t.worker_amount, 0);

  if (loading) {
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
          <h1 className="text-lg font-medium text-ink-900">Mon portefeuille</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card className="bg-white text-center">
            <p className="text-xl font-semibold text-wine-600">
              {totalPaye.toLocaleString("fr-FR")} FCFA
            </p>
            <p className="text-xs text-ink-600">Reçu</p>
          </Card>
          <Card className="bg-white text-center">
            <p className="text-xl font-semibold text-wine-600">
              {totalEnAttente.toLocaleString("fr-FR")} FCFA
            </p>
            <p className="text-xs text-ink-600">En attente</p>
          </Card>
        </div>

        <p className="mb-3 text-sm font-medium text-ink-600">Historique</p>
        <div className="flex flex-col gap-3">
          {transactions.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucune transaction pour le moment.
            </p>
          )}
          {transactions.map((t) => (
            <Card key={t.id} className="bg-white">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">
                  {t.worker_amount.toLocaleString("fr-FR")} FCFA
                </p>
                <span className="text-xs text-ink-600">
                  {t.status === "paye"
                    ? "Payé"
                    : t.status === "en_attente"
                      ? "En attente"
                      : "Échoué"}
                </span>
              </div>
              <p className="text-xs text-ink-400">
                Montant total {t.amount.toLocaleString("fr-FR")} FCFA · Commission{" "}
                {t.commission.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {new Date(t.created_at).toLocaleDateString("fr-FR")}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
