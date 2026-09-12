"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type Status = "en_attente" | "acceptee" | "refusee" | "terminee";
type Urgency = "normal" | "eleve" | "tres_eleve";

type RequestItem = {
  id: string;
  description: string;
  urgency: Urgency;
  status: Status;
  created_at: string;
  client_name: string;
  category_name: string | null;
};

const statusLabel: Record<Status, string> = {
  en_attente: "🟠 En attente",
  acceptee: "🟢 Acceptée",
  refusee: "Refusée",
  terminee: "Terminée",
};

const statusTone: Record<Status, "success" | "warning" | "neutral"> = {
  en_attente: "warning",
  acceptee: "success",
  refusee: "neutral",
  terminee: "neutral",
};

const urgencyLabel: Record<Urgency, string> = {
  normal: "Normal",
  eleve: "Urgence élevée",
  tres_eleve: "Urgence très élevée",
};

export default function TravailleurDemandesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/connexion");
      return;
    }

    const { data: rawRequests } = await supabase
      .from("requests")
      .select("id, description, urgency, status, created_at, client_id, category_id")
      .eq("worker_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!rawRequests || rawRequests.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const clientIds = [...new Set(rawRequests.map((r) => r.client_id))];
    const categoryIds = [
      ...new Set(rawRequests.map((r) => r.category_id).filter(Boolean)),
    ];

    const [{ data: clients }, { data: categories }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", clientIds),
      supabase.from("categories").select("id, name").in("id", categoryIds),
    ]);

    const clientNameById = new Map(
      (clients ?? []).map((c) => [c.id, c.full_name])
    );
    const categoryNameById = new Map(
      (categories ?? []).map((c) => [c.id, c.name])
    );

    setRequests(
      rawRequests.map((r) => ({
        id: r.id,
        description: r.description,
        urgency: r.urgency,
        status: r.status,
        created_at: r.created_at,
        client_name: clientNameById.get(r.client_id) ?? "Client",
        category_name: r.category_id
          ? categoryNameById.get(r.category_id) ?? null
          : null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, status: Status) {
    await supabase.from("requests").update({ status }).eq("id", id);
    loadRequests();
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push("/")} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">Mes demandes</h1>
      </div>

      {loading && <p className="text-sm text-ink-600">Chargement…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-sm text-ink-600">
          Aucune demande reçue pour l'instant.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {requests.map((req) => (
          <Card key={req.id}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {req.client_name}
                </p>
                {req.category_name && (
                  <p className="text-xs text-ink-600">{req.category_name}</p>
                )}
              </div>
              <Badge tone={statusTone[req.status]}>
                {statusLabel[req.status]}
              </Badge>
            </div>

            <p className="mb-2 text-sm text-ink-900">{req.description}</p>
            <p className="mb-3 text-xs text-ink-600">
              {urgencyLabel[req.urgency]}
            </p>

            {req.status === "en_attente" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => updateStatus(req.id, "acceptee")}
                  className="flex-1"
                >
                  Accepter
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => updateStatus(req.id, "refusee")}
                  className="flex-1"
                >
                  Refuser
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
