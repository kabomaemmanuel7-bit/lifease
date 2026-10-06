"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null };
type Msg = { id: string; sender_id: string; body: string | null; audio_path: string | null; media_path: string | null; created_at: string; deleted_at: string | null };

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [name, setName] = useState("Groupe");
  const [count, setCount] = useState(0);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const addMsg = useCallback((m: Msg) => {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      setMe(uid);
      if (!uid) return;
      const { data: g } = await supabase.from("conversations").select("name").eq("id", id).maybeSingle();
      if (!g) { setError("Groupe introuvable."); return; }
      setName(g.name ?? "Groupe");
      const { data: mem } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", id);
      const ids = (mem ?? []).map((x) => x.user_id as string);
      setCount(ids.length);
      const { data: dir } = await supabase.from("worker_directory").select("id, full_name").in("id", ids);
      const map: Record<string, Person> = {};
      ((dir ?? []) as Person[]).forEach((p) => { map[p.id] = p; });
      setPeople(map);
      const { data: ms } = await supabase.from("messages").select("id, sender_id, body, audio_path, media_path, created_at, deleted_at").eq("conversation_id", id).order("created_at", { ascending: true });
      setMsgs((ms ?? []) as Msg[]);
      channel = supabase
        .channel("grp-" + id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (p) => addMsg(p.new as Msg))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (p) => addMsg(p.new as Msg))
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [id, addMsg]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    const body = text.trim();
    if (!body || !me) return;
    setText("");
    setError("");
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body }).select().single();
    if (err) { setError("Envoi impossible : " + err.message); setText(body); return; }
    addMsg(data as Msg);
  }

  const who = (uid: string) => people[uid]?.full_name ?? "Membre";
  const time = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const content = (m: Msg) => (m.deleted_at ? "🚫 Message supprimé" : m.body ?? (m.audio_path ? "🎤 Message vocal" : m.media_path ? "📎 Fichier" : ""));

  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">{error || "Chargement…"}</main>;

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col bg-beige-50">
      <header className="flex items-center gap-3 border-b border-ink-400/20 bg-white px-4 py-3">
        <Link href="/messages" className="text-ink-600">←</Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-700 text-white">👥</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight text-ink-900">{name}</p>
          <p className="text-xs text-ink-400">{count} membres</p>
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[80%] rounded-md px-3 py-2 text-sm " + (mine ? "bg-wine-700 text-white" : "bg-white text-ink-900 shadow-sm")}>
                {!mine && <p className="mb-0.5 text-xs font-medium text-wine-700">{who(m.sender_id)}</p>}
                <p className={"whitespace-pre-wrap break-words" + (m.deleted_at ? " italic opacity-70" : "")}>{content(m)}</p>
                <div className="mt-1 text-right text-[10px] opacity-80">{time(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}
      <footer className="flex items-center gap-2 border-t border-ink-400/20 bg-white px-3 py-3">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Écrire un message" className="flex-1 rounded-full border border-ink-400/30 px-4 py-2 text-sm" />
        <button onClick={send} disabled={!text.trim()} className="rounded-full bg-wine-700 px-4 py-2 text-sm text-white disabled:opacity-50">Envoyer</button>
      </footer>
    </main>
  );
}
