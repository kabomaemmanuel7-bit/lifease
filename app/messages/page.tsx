"use client";
import { MessagesIcon } from "@/components/MessagesIcon";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PushToggle from "@/components/PushToggle";

type Person = { id: string; full_name: string | null; avatar_url: string | null };
type Conv = { id: string; user_a: string | null; user_b: string | null; is_group: boolean | null; name: string | null; avatar_url: string | null; last_message_at: string };
type Msg = { conversation_id: string; sender_id: string; body: string | null; audio_path: string | null; read_at: string | null; created_at: string; deleted_at: string | null; media_path: string | null };
type St = { conversation_id: string; archived: boolean; cleared_at: string | null };
type Row = { id: string; other: string; group: boolean; title: string; pic: string | null; last: string; at: string; unread: number; archived: boolean };

export default function MessagesPage() {
  const [me, setMe] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [workers, setWorkers] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const full = role === "travailleur" || role === "admin";
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(data?.role ?? null);
    });
  }, []);
  const [tab, setTab] = useState<"actives" | "archives">("actives");
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
      const { data: convs } = await supabase.from("conversations").select("id, user_a, user_b, is_group, name, avatar_url, last_message_at").order("last_message_at", { ascending: false });
      const cl = (convs ?? []) as Conv[];
      const { data: sts } = await supabase.from("conversation_user_state").select("conversation_id, archived, cleared_at");
      const stMap: Record<string, St> = {};
      ((sts ?? []) as St[]).forEach((x) => { stMap[x.conversation_id] = x; });
      const { data: grs } = await supabase.from("group_reads").select("conversation_id, last_read_at").eq("user_id", uid);
      const { data: jn } = await supabase.from("conversation_members").select("conversation_id, joined_at").eq("user_id", uid);
      const cut: Record<string, string> = {};
      (jn ?? []).forEach((x) => { cut[x.conversation_id as string] = x.joined_at as string; });
      (grs ?? []).forEach((x) => { cut[x.conversation_id as string] = x.last_read_at as string; });
      let msgs: Msg[] = [];
      if (cl.length) {
        const r = await supabase.from("messages").select("conversation_id, sender_id, body, audio_path, read_at, created_at, deleted_at, media_path").in("conversation_id", cl.map((c) => c.id)).order("created_at", { ascending: false }).limit(500);
        msgs = (r.data ?? []) as Msg[];
      }
      const out: Row[] = [];
      cl.forEach((c) => {
        const st = stMap[c.id];
        const mine = msgs.filter((m) => m.conversation_id === c.id && (!st?.cleared_at || m.created_at > st.cleared_at));
        if (st?.cleared_at && mine.length === 0) return;
        const last = mine[0];
        const g = !!c.is_group;
        const c0 = cut[c.id] ? new Date(cut[c.id]) : null;
        out.push({
          id: c.id,
          other: c.user_a === uid ? c.user_b ?? "" : c.user_a ?? "",
          group: g,
          title: c.name ?? "Groupe",
          pic: c.avatar_url ?? null,
          last: last ? (last.deleted_at ? "🚫 Message supprimé" : last.body ?? (last.media_path ? "📎 Fichier" : "🎤 Message vocal")) : "Nouvelle conversation",
          at: c.last_message_at,
          unread: mine.filter((m) => m.sender_id !== uid && !m.deleted_at && (g ? !c0 || new Date(m.created_at) > c0 : !m.read_at)).length,
          archived: !!st?.archived,
        });
      });
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const name = (id: string) => people[id]?.full_name ?? "Travailleur";
  const avatar = (id: string) => {
    const p = people[id];
    if (p?.avatar_url) return <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />;
    return <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#15803D] font-semibold text-white">{name(id).charAt(0).toUpperCase()}</div>;
  };
  const when = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const filtered = workers.filter((w) => (w.full_name ?? "").toLowerCase().includes(q.toLowerCase()));
  const shown = rows.filter((r) => (tab === "archives") === r.archived);
  const nArch = rows.filter((r) => r.archived).length;

  if (loading) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">Chargement…</main>;
  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6"><Link href="/" className="text-wine-700 underline">Connecte-toi pour voir tes messages</Link></main>;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#101916] px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#F4F7F5]"><MessagesIcon className="h-9 w-9 text-[#39E6B0]" />Messages</h1>
        {full && <Link href="/groupes/nouveau" className="rounded-full bg-[#145B46] px-4 py-2 text-sm font-semibold text-[#39E6B0]">👥 Nouveau groupe</Link>}
      </div>
      <div className="mt-4"><PushToggle /></div>
      <div className="mt-4 flex gap-2 rounded-full bg-[#252D2A] p-1">
        <button onClick={() => setTab("actives")} className={"flex-1 rounded-full py-2.5 text-sm font-semibold " + (tab === "actives" ? "bg-[#39E6B0] text-[#101916] shadow" : "text-[#F4F7F5]/70")}>Conversations</button>
        {full && <button onClick={() => setTab("archives")} className={"flex-1 rounded-full py-2.5 text-sm font-semibold " + (tab === "archives" ? "bg-[#39E6B0] text-[#101916] shadow" : "text-[#F4F7F5]/70")}>Archivées{nArch > 0 ? " (" + nArch + ")" : ""}</button>}
      </div>
      <div className="mt-4 space-y-3">
        {shown.length === 0 && <p className="text-sm text-[#F4F7F5]/50">{tab === "archives" ? "Aucune conversation archivée." : "Aucune conversation pour l’instant."}</p>}
        {shown.map((r) => (
          <Link key={r.id} href={r.group ? `/messages/groupe/${r.id}` : `/messages/${r.id}`} className="flex items-center gap-3 rounded-2xl bg-[#252D2A] p-3.5">
            {r.group ? (r.pic ? <img src={r.pic} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white">👥</div>) : avatar(r.other)}
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><span className="truncate font-bold text-[#F4F7F5]">{r.group ? r.title : name(r.other)}</span><span className="text-xs text-[#F4F7F5]/50">{when(r.at)}</span></div>
              <p className="truncate text-sm text-[#F4F7F5]/70">{r.last}</p>
            </div>
            {r.unread > 0 && <span className="rounded-full bg-[#39E6B0] px-2 py-0.5 text-xs font-semibold text-[#101916]">{r.unread}</span>}
            <span className="text-xl text-[#F4F7F5]/50">›</span>
          </Link>
        ))}
      </div>
{full && (<>
      <button onClick={() => setShowNew(true)} aria-label="Nouvelle conversation" className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#39E6B0] text-[#101916] shadow-xl">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M12 9v6M9 12h6" /></svg>
      </button>
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowNew(false)}>
          <div className="max-h-[75vh] w-full overflow-y-auto rounded-t-3xl bg-[#101916] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F4F7F5]">Écrire à un travailleur</h2>
              <button onClick={() => setShowNew(false)} aria-label="Fermer" className="text-xl text-[#F4F7F5]/50">✕</button>
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom" className="mt-3 w-full rounded-full border border-white/10 bg-[#252D2A] px-4 py-2.5 text-sm text-[#F4F7F5]" />
            <div className="mt-3 space-y-3">
              {filtered.map((w) => (
                <Link key={w.id} href={`/messages/avec/${w.id}`} className="flex items-center gap-3 rounded-2xl bg-[#252D2A] p-3.5">
                  {avatar(w.id)}
                  <span className="font-medium text-[#F4F7F5]">{w.full_name ?? "Travailleur"}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
</>)}
    </main>
  );
}
