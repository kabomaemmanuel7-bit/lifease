"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null; avatar_url: string | null };
type Conv = { id: string; user_a: string; user_b: string; last_message_at: string };
type Msg = { conversation_id: string; sender_id: string; body: string | null; audio_path: string | null; read_at: string | null; created_at: string };
type Row = { id: string; other: string; last: string; at: string; unread: number };

export default function MessagesPage() {
  const [me, setMe] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [workers, setWorkers] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      setMe(uid);
      if (!uid) { setLoading(false); return; }
      const { data: dir } = await supabase.from("worker_directory").select("id, full_name, avatar_url");
      const list = (dir ?? []) as Person[];
      const map: Record<string, Person> = {};
      list.forEach((p) => { map[p.id] = p; });
      setPeople(map);
      setWorkers(list.filter((p) => p.id !== uid));
      const { data: convs } = await supabase.from("conversations").select("id, user_a, user_b, last_message_at").order("last_message_at", { ascending: false });
      const cl = (convs ?? []) as Conv[];
      let msgs: Msg[] = [];
      if (cl.length) {
        const r = await supabase.from("messages").select("conversation_id, sender_id, body, audio_path, read_at, created_at").in("conversation_id", cl.map((c) => c.id)).order("created_at", { ascending: false }).limit(500);
        msgs = (r.data ?? []) as Msg[];
      }
      setRows(cl.map((c) => {
        const mine = msgs.filter((m) => m.conversation_id === c.id);
        const last = mine[0];
        return {
          id: c.id,
          other: c.user_a === uid ? c.user_b : c.user_a,
          last: last ? (last.body ?? "🎤 Message vocal") : "Nouvelle conversation",
          at: c.last_message_at,
          unread: mine.filter((m) => m.sender_id !== uid && !m.read_at).length,
        };
      }));
      setLoading(false);
    })();
  }, []);

  const name = (id: string) => people[id]?.full_name ?? "Travailleur";
  const avatar = (id: string) => {
    const p = people[id];
    if (p?.avatar_url) return <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />;
    return <div className="flex h-11 w-11 items-center justify-center rounded-full bg-wine-100 font-semibold text-wine-700">{name(id).charAt(0).toUpperCase()}</div>;
  };
  const when = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const filtered = workers.filter((w) => (w.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  if (loading) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">Chargement…</main>;
  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6"><Link href="/" className="text-wine-700 underline">Connecte-toi pour voir tes messages</Link></main>;
  return (
    <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6">
      <h1 className="text-xl font-semibold text-ink-900">Messages</h1>
      <div className="mt-4 space-y-2">
        {rows.length === 0 && <p className="text-sm text-ink-400">Aucune conversation pour l’instant.</p>}
        {rows.map((r) => (
          <Link key={r.id} href={`/messages/${r.id}`} className="flex items-center gap-3 rounded-md bg-white p-3 shadow-sm">
            {avatar(r.other)}
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><span className="truncate font-medium text-ink-900">{name(r.other)}</span><span className="text-xs text-ink-400">{when(r.at)}</span></div>
              <p className="truncate text-sm text-ink-600">{r.last}</p>
            </div>
            {r.unread > 0 && <span className="rounded-full bg-wine-700 px-2 py-0.5 text-xs text-white">{r.unread}</span>}
          </Link>
        ))}
      </div>
      <h2 className="mt-8 text-sm font-semibold text-ink-900">Écrire à un travailleur</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom" className="mt-2 w-full rounded-md border border-ink-400/30 bg-white px-3 py-2 text-sm" />
      <div className="mt-3 space-y-2">
        {filtered.map((w) => (
          <Link key={w.id} href={`/messages/avec/${w.id}`} className="flex items-center gap-3 rounded-md bg-white p-3 shadow-sm">
            {avatar(w.id)}
            <span className="text-ink-900">{w.full_name ?? "Travailleur"}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
