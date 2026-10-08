"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Quote = { id: string; labor: number; parts: number; travel: number; total: number; note: string | null; status: string };
const label: Record<string, string> = { envoye: "En attente", accepte: "Accepté", refuse: "Refusé" };
const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const btn = "rounded-lg bg-[#6B1E2C] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

export default function QuotePanel({ requestId, role }: { requestId: string; role: "worker" | "client" }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [labor, setLabor] = useState("");
  const [parts, setParts] = useState("");
  const [travel, setTravel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("quotes").select("*").eq("request_id", requestId).order("created_at", { ascending: false });
    setQuotes((data as Quote[]) || []);
  }
  useEffect(() => { load(); }, [requestId]);

  async function send() {
    setBusy(true); setError("");
    const { error: e } = await supabase.from("quotes").insert({
      request_id: requestId, labor: Number(labor) || 0, parts: Number(parts) || 0,
      travel: Number(travel) || 0, note: note || null,
    });
    if (e) setError(e.message); else { setLabor(""); setParts(""); setTravel(""); setNote(""); await load(); }
    setBusy(false);
  }

  async function respond(id: string, accept: boolean) {
    setBusy(true); setError("");
    const { error: e } = await supabase.rpc("respond_quote", { p_quote_id: id, p_accept: accept });
    if (e) setError(e.message);
    await load();
    setBusy(false);
  }

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold">Devis</h2>
      {quotes.map((q) => (
        <div key={q.id} className="mb-3 rounded-xl bg-[#F5EFE6] p-3 text-sm">
          <p>Main-d&apos;œuvre : {q.labor} F · Pièces : {q.parts} F · Déplacement : {q.travel} F</p>
          <p className="mt-1 font-semibold">Total : {q.total} F · {label[q.status]}</p>
          {q.note && <p className="mt-1 text-neutral-600">{q.note}</p>}
          {role === "client" && q.status === "envoye" && (
            <div className="mt-2 flex gap-2">
              <button className={btn} disabled={busy} onClick={() => respond(q.id, true)}>Accepter</button>
              <button className="rounded-lg border px-4 py-2 text-sm" disabled={busy} onClick={() => respond(q.id, false)}>Refuser</button>
            </div>
          )}
        </div>
      ))}
      {quotes.length === 0 && <p className="text-sm text-neutral-500">Aucun devis pour l&apos;instant.</p>}
      {role === "worker" && (
        <div className="mt-3 space-y-2">
          <input className={input} inputMode="numeric" placeholder="Main-d'œuvre (F)" value={labor} onChange={(e) => setLabor(e.target.value)} />
          <input className={input} inputMode="numeric" placeholder="Pièces (F)" value={parts} onChange={(e) => setParts(e.target.value)} />
          <input className={input} inputMode="numeric" placeholder="Déplacement (F)" value={travel} onChange={(e) => setTravel(e.target.value)} />
          <input className={input} placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={btn} disabled={busy} onClick={send}>Envoyer le devis</button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
