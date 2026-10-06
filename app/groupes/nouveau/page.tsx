"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null; avatar_url: string | null };

export default function NewGroupPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [list, setList] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      setMe(uid);
      const { data } = await supabase.from("worker_directory").select("id, full_name, avatar_url");
      setList(((data ?? []) as Person[]).filter((p) => p.id !== uid));
    })();
  }, []);

  function toggle(pid: string) {
    setSel((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  }

  async function create() {
    if (!name.trim() || sel.length === 0 || busy) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("create_group", { p_name: name.trim(), p_members: sel });
    setBusy(false);
    if (err) { setError("Création impossible : " + err.message); return; }
    router.push("/messages/groupe/" + data);
  }

  const shown = list.filter((p) => (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()));
  const ready = name.trim().length > 0 && sel.length > 0 && !busy;

  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6"><Link href="/" className="text-wine-700 underline">Connecte-toi pour créer un groupe</Link></main>;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="text-ink-600">←</Link>
        <h1 className="text-xl font-semibold text-ink-900">Nouveau groupe</h1>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nom du groupe" className="mt-4 w-full rounded-md border border-ink-400/30 bg-white px-3 py-2 text-sm" />
      <p className="mt-4 text-sm font-semibold text-ink-900">Membres ({sel.length})</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom" className="mt-2 w-full rounded-md border border-ink-400/30 bg-white px-3 py-2 text-sm" />
      <div className="mt-3 space-y-2">
        {shown.map((p) => (
          <button key={p.id} onClick={() => toggle(p.id)} className="flex w-full items-center gap-3 rounded-md bg-white p-3 text-left shadow-sm">
            <span className={"flex h-6 w-6 items-center justify-center rounded border " + (sel.includes(p.id) ? "border-wine-700 bg-wine-700 text-white" : "border-ink-400/40")}>{sel.includes(p.id) ? "✓" : ""}</span>
            <span className="text-ink-900">{p.full_name ?? "Travailleur"}</span>
          </button>
        ))}
        {shown.length === 0 && <p className="text-sm text-ink-400">Aucun résultat.</p>}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button onClick={create} disabled={!ready} className="mt-5 w-full rounded-md bg-wine-700 py-3 text-center text-white disabled:opacity-50">{busy ? "Création…" : "Créer le groupe"}</button>
    </main>
  );
}
