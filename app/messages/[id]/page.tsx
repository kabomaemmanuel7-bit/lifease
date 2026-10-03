"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null; avatar_url: string | null };
type Msg = { id: string; conversation_id: string; sender_id: string; body: string | null; audio_path: string | null; audio_seconds: number | null; read_at: string | null; created_at: string; edited_at: string | null; deleted_at: string | null };

const EDIT_MS = 15 * 60 * 1000;

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [other, setOther] = useState<Person | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [menu, setMenu] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);
  const secsRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const { data: c } = await supabase.from("conversations").select("user_a, user_b").eq("id", id).single();
      if (!c) { setError("Conversation introuvable."); return; }
      const otherId = c.user_a === uid ? c.user_b : c.user_a;
      const { data: p } = await supabase.from("worker_directory").select("id, full_name, avatar_url").eq("id", otherId).single();
      setOther((p as Person | null) ?? { id: otherId, full_name: "Travailleur", avatar_url: null });
      const { data: ms } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
      setMsgs((ms ?? []) as Msg[]);
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", id).neq("sender_id", uid).is("read_at", null);
      channel = supabase.channel("conv-" + id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (payload) => {
          const m = payload.new as Msg;
          addMsg(m);
          if (m.sender_id !== uid) supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (payload) => addMsg(payload.new as Msg))
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [id, addMsg]);

  useEffect(() => {
    msgs.forEach(async (m) => {
      if (!m.audio_path || urls[m.audio_path]) return;
      const { data } = await supabase.storage.from("voice").createSignedUrl(m.audio_path, 3600);
      if (data?.signedUrl) setUrls((u) => ({ ...u, [m.audio_path as string]: data.signedUrl }));
    });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, urls]);

  async function sendText() {
    const body = text.trim();
    if (!body || !me) return;
    if (editing) {
      const target = editing;
      if (body !== target.body) {
        const { data, error: err } = await supabase.from("messages").update({ body, edited_at: new Date().toISOString() }).eq("id", target.id).select().single();
        if (err) { setError("Modification impossible : " + err.message); return; }
        addMsg(data as Msg);
      }
      setEditing(null);
      setText("");
      return;
    }
    setText("");
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body }).select().single();
    if (err) { setError("Envoi impossible : " + err.message); setText(body); return; }
    addMsg(data as Msg);
  }

  async function deleteMsg(m: Msg) {
    setMenu(null);
    setError("");
    if (m.audio_path) await supabase.storage.from("voice").remove([m.audio_path]);
    const { data, error: err } = await supabase.from("messages").update({ body: null, audio_path: null, audio_seconds: null, deleted_at: new Date().toISOString() }).eq("id", m.id).select().single();
    if (err) { setError("Suppression impossible : " + err.message); return; }
    addMsg(data as Msg);
  }

  function startEdit(m: Msg) {
    setMenu(null);
    setEditing(m);
    setText(m.body ?? "");
  }

  function pressStart(m: Msg) {
    if (m.sender_id !== me || m.deleted_at) return;
    pressRef.current = setTimeout(() => setMenu(m), 450);
  }

  function pressEnd() {
    if (pressRef.current) clearTimeout(pressRef.current);
  }

  async function startRec() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); finishRec(rec.mimeType); };
      rec.start();
      recRef.current = rec;
      secsRef.current = 0; setSecs(0);
      setRecording(true);
      timerRef.current = setInterval(() => { secsRef.current += 1; setSecs(secsRef.current); }, 1000);
    } catch {
      setError("Micro inaccessible : autorise le micro dans ton navigateur.");
    }
  }

  function stopRec(cancel: boolean) {
    cancelRef.current = cancel;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    recRef.current?.stop();
  }

  async function finishRec(mime: string) {
    if (cancelRef.current || !me) return;
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
    if (blob.size < 1000) return;
    const ext = mime.includes("mp4") ? "m4a" : "webm";
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("voice").upload(path, blob, { contentType: blob.type.split(";")[0] });
    if (upErr) { setError("Envoi du vocal impossible : " + upErr.message); return; }
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, audio_path: path, audio_seconds: secsRef.current }).select().single();
    if (err) { setError("Envoi du vocal impossible : " + err.message); return; }
    addMsg(data as Msg);
  }

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const time = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">{error || "Chargement…"}</main>;

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col bg-beige-50">
      <header className="flex items-center gap-3 border-b border-ink-400/20 bg-white px-4 py-3">
        <Link href="/messages" className="text-ink-600">←</Link>
        {other?.avatar_url ? <img src={other.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-100 font-semibold text-wine-700">{(other?.full_name ?? "?").charAt(0).toUpperCase()}</div>}
        <span className="font-medium text-ink-900">{other?.full_name ?? "…"}</span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                onTouchStart={() => pressStart(m)}
                onTouchEnd={pressEnd}
                onTouchMove={pressEnd}
                onContextMenu={(e) => { e.preventDefault(); if (mine && !m.deleted_at) setMenu(m); }}
                className={"max-w-[80%] select-none rounded-md px-3 py-2 text-sm " + (mine ? "bg-wine-700 text-white" : "bg-white text-ink-900 shadow-sm")}
              >
                {m.deleted_at ? (
                  <p className="italic opacity-70">🚫 Message supprimé</p>
                ) : (
                  <>
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    {m.audio_path && (urls[m.audio_path] ? <audio controls src={urls[m.audio_path]} className="h-10 max-w-full" /> : <span>🎤 Chargement…</span>)}
                  </>
                )}
                <div className="mt-1 text-right text-[10px] opacity-70">{m.edited_at && !m.deleted_at ? "modifié · " : ""}{m.audio_seconds ? fmt(m.audio_seconds) + " · " : ""}{time(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}
      {menu && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setMenu(null)}>
          <div className="mx-auto w-full max-w-md rounded-t-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            {menu.body && Date.now() - new Date(menu.created_at).getTime() < EDIT_MS && (
              <button onClick={() => startEdit(menu)} className="block w-full px-4 py-3 text-left text-ink-900">✏️ Modifier</button>
            )}
            <button onClick={() => deleteMsg(menu)} className="block w-full px-4 py-3 text-left text-wine-700">🗑️ Supprimer pour tout le monde</button>
            <button onClick={() => setMenu(null)} className="block w-full px-4 py-3 text-left text-ink-600">Annuler</button>
          </div>
        </div>
      )}
      {editing && (
        <div className="flex items-center justify-between border-t border-ink-400/20 bg-wine-50 px-4 py-2 text-sm text-wine-700">
          <span>Modification du message</span>
          <button onClick={() => { setEditing(null); setText(""); }}>✕</button>
        </div>
      )}
      <footer className="flex items-center gap-2 border-t border-ink-400/20 bg-white px-3 py-3">
        {recording ? (
          <>
            <button onClick={() => stopRec(true)} className="px-2 text-ink-600">✕</button>
            <span className="flex-1 text-sm text-wine-700">● Enregistrement {fmt(secs)}</span>
            <button onClick={() => stopRec(false)} className="rounded-full bg-wine-700 px-4 py-2 text-sm text-white">Envoyer</button>
          </>
        ) : (
          <>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendText(); }} placeholder="Écrire un message" className="flex-1 rounded-full border border-ink-400/30 px-4 py-2 text-sm" />
            {text.trim() || editing ? <button onClick={sendText} className="rounded-full bg-wine-700 px-4 py-2 text-sm text-white">{editing ? "Enregistrer" : "Envoyer"}</button> : <button onClick={startRec} aria-label="Message vocal" className="rounded-full bg-wine-700 px-3 py-2 text-white">🎤</button>}
          </>
        )}
      </footer>
    </main>
  );
}
