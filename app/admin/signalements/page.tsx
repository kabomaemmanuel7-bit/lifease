"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Rep = { id: string; reporter_id: string; reported_id: string; reason: string; status: string; created_at: string };
type Prob = { id: string; worker_id: string; message: string; status: string; created_at: string };

export default function AdminReportsPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [tab, setTab] = useState<"msg" | "pb">("msg");
  const [showDone, setShowDone] = useState(false);
  const [reps, setReps] = useState<Rep[]>([]);
  const [probs, setProbs] = useState<Prob[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: r, error: e1 } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    const { data: p, error: e2 } = await supabase.from("problem_reports").select("*").order("created_at", { ascending: false });
    if (e1 || e2) setError("Lecture impossible : " + (e1?.message ?? e2?.message));
    const rl = (r ?? []) as Rep[];
    const pl = (p ?? []) as Prob[];
    setReps(rl);
    setProbs(pl);
    const ids = Array.from(new Set([...rl.flatMap((x) => [x.reporter_id, x.reported_id]), ...pl.map((x) => x.worker_id)]));
    if (ids.length === 0) return;
    const { data: pr } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    const m: Record<string, string> = {};
    (pr ?? []).forEach((x) => { m[x.id as string] = (x.full_name as string) ?? "Inconnu"; });
    setNames(m);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { router.push("/connexion"); return; }
      const { data: pf } = await supabase.from("profiles").select("role").eq("id", s.session.user.id).single();
      if (pf?.role !== "admin") { router.push("/"); return; }
      setOk(true);
      load();
    })();
  }, [router, load]);

  async function setStatus(table: "reports" | "problem_reports", id: string, status: string) {
    setError("");
    const { error: err } = await supabase.from(table).update({ status }).eq("id", id);
    if (err) { setError("Action impossible : " + err.message); return; }
    load();
  }

  const name = (id: string) => names[id] ?? "Inconnu";
  const when = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const rs = reps.filter((x) => showDone || x.status !== "traite");
  const ps = probs.filter((x) => showDone || x.status !== "traite");
  const nNew = (a: { status: string }[]) => a.filter((x) => x.status !== "traite").length;
  const flip = (s: string) => (s === "traite" ? "nouveau" : "traite");
  const tabCls = (t: string) => "pb-2 " + (tab === t ? "border-b-2 border-wine-700 font-medium text-wine-700" : "text-ink-600");

  if (!ok) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">Chargement…</main>;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6">
      <Link href="/compte" className="text-sm text-ink-600">← Retour</Link>
      <h1 className="mt-2 text-xl font-semibold text-ink-900">Signalements</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-4 border-b border-beige-200 text-sm">
        <button onClick={() => setTab("msg")} className={tabCls("msg")}>Messagerie ({nNew(reps)})</button>
        <button onClick={() => setTab("pb")} className={tabCls("pb")}>Travailleurs ({nNew(probs)})</button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
        Afficher aussi les signalements traités
      </label>
      <div className="mt-3 space-y-2">
        {(tab === "msg" ? rs.length : ps.length) === 0 && <p className="text-sm text-ink-400">Aucun signalement.</p>}
        {tab === "msg" && rs.map((x) => (
          <div key={x.id} className="rounded-md bg-white p-3 shadow-sm">
            <div className="flex justify-between text-xs text-ink-400"><span>{when(x.created_at)}</span><span>{x.status === "traite" ? "Traité" : "Nouveau"}</span></div>
            <p className="mt-1 text-sm text-ink-900"><b>{name(x.reporter_id)}</b> signale <b>{name(x.reported_id)}</b></p>
            <p className="mt-1 text-sm text-ink-600">Motif : {x.reason}</p>
            <button onClick={() => setStatus("reports", x.id, flip(x.status))} className="mt-2 text-sm font-medium text-wine-700">{x.status === "traite" ? "Rouvrir" : "Marquer comme traité"}</button>
          </div>
        ))}
        {tab === "pb" && ps.map((x) => (
          <div key={x.id} className="rounded-md bg-white p-3 shadow-sm">
            <div className="flex justify-between text-xs text-ink-400"><span>{when(x.created_at)}</span><span>{x.status === "traite" ? "Traité" : "Nouveau"}</span></div>
            <p className="mt-1 text-sm font-medium text-ink-900">{name(x.worker_id)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{x.message}</p>
            <button onClick={() => setStatus("problem_reports", x.id, flip(x.status))} className="mt-2 text-sm font-medium text-wine-700">{x.status === "traite" ? "Rouvrir" : "Marquer comme traité"}</button>
          </div>
        ))}
      </div>
    </main>
  );
}
