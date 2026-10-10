"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import QuotePanel from "@/components/QuotePanel";
import RequestDetails from "@/components/RequestDetails";
import MessageLink from "@/components/MessageLink";

type Row = {
  id: string; description: string; status: string; created_at: string;
  worker_id: string | null; contact_name: string | null; address: string | null;
  google_maps_link: string | null; video_url: string | null;
  service: { name: string } | null;
};
const LABEL: Record<string, string> = { en_attente: "En attente", acceptee: "Acceptée", refusee: "Refusée", terminee: "Terminée" };

export default function MesDemandesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }
      const { data, error: e } = await supabase.from("requests")
        .select("id, description, status, created_at, worker_id, contact_name, address, google_maps_link, video_url, service:services ( name )")
        .eq("client_id", user.id).order("created_at", { ascending: false });
      if (e) { setError("Impossible de charger : " + e.message); setLoading(false); return; }
      const list = (data as unknown as Row[]) ?? [];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.worker_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        setNames(Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name])));
      }
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.push("/compte")} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
          <h1 className="text-lg font-medium text-ink-900">Mes demandes</h1>
        </div>
        {loading && <p className="text-sm text-ink-600">Chargement…</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {!loading && !error && rows.length === 0 && (
          <Card className="bg-white"><p className="text-sm text-ink-600">Aucune demande pour le moment.</p></Card>
        )}
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.id} className="bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{r.service?.name ?? "Service"}</p>
                  <p className="text-xs text-ink-400">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                </div>
                <Badge tone={r.status === "refusee" ? "neutral" : "wine"}>{LABEL[r.status] ?? r.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-ink-600">{r.description}</p>
              <RequestDetails d={r} />
              {r.worker_id && (r.status === "acceptee" || r.status === "terminee") && <MessageLink userId={r.worker_id} label={`Écrire à ${names[r.worker_id] ?? "le prestataire"}`} />}
              {(r.status === "en_attente" || r.status === "acceptee") && <QuotePanel requestId={r.id} role="client" />}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
