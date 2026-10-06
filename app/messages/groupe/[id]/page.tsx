"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null };
type Msg = { id: string; sender_id: string; body: string | null; audio_path: string | null; audio_seconds: number | null; media_path: string | null; media_type: string | null; media_name: string | null; created_at: string; deleted_at: string | null };

const COLS = "id, sender_id, body, audio_path, audio_seconds, media_path, media_type, media_name, created_at, deleted_at";

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [name, setName] = useState("Groupe");
  const [count, setCount] = useState(0);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);
  const secsRef = useRef(0);

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
      const { data: ms } = await supabase.from("messages").select(COLS).eq("conversation_id", id).order("created_at", { ascending: true });
      setMsgs((ms ?? []) as Msg[]);
      channel = supabase
        .channel("grp-" + id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (p) => addMsg(p.new as Msg))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (p) => addMsg(p.new as Msg))
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [id, addMsg]);

  useEffect(() => {
    msgs.forEach(async (m) => {
      if (m.audio_path && !urls[m.audio_path]) {
        const { data } = await supabase.storage.from("voice").createSignedUrl(m.audio_path, 3600);
        if (data?.signedUrl) setUrls((u) => ({ ...u, [m.audio_path as string]: data.signedUrl }));
      }
      if (m.media_path && !urls[m.media_path]) {
        const { data } = await supabase.storage.from("chatfiles").createSignedUrl(m.media_path, 3600);
        if (data?.signedUrl) setUrls((u) => ({ ...u, [m.media_path as string]: data.signedUrl }));
      }
    });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, urls]);

  async function send() {
    const body = text.trim();
    if (!body || !me) return;
    setText("");
    setError("");
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body }).select().single();
    if (err) { setError("Envoi impossible : " + err.message); setText(body); return; }
    addMsg(data as Msg);
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

  async function sendFile(file: File | undefined, kind: "image" | "video" | "file") {
    setSheet(false);
    if (!file || !me) return;
    if (file.size > 25 * 1024 * 1024) { setError("Fichier trop lourd (25 Mo maximum)."); return; }
    setBusy(true);
    setError("");
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${id}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("chatfiles").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (upErr) { setBusy(false); setError("Envoi impossible : " + upErr.message); return; }
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, media_path: path, media_type: kind, media_name: file.name }).select().single();
    setBusy(false);
    if (err) { setError("Envoi impossible : " + err.message); return; }
    addMsg(data as Msg);
  }

  function pick(e: { target: HTMLInputElement }) {
    const f = e.target.files?.[0];
    const t = f?.type.startsWith("image/") ? "image" : f?.type.startsWith("video/") ? "video" : "file";
    sendFile(f, t);
    e.target.value = "";
  }

  const who = (uid: string) => people[uid]?.full_name ?? "Membre";
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const time = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

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
                {m.deleted_at ? (
                  <p className="italic opacity-70">🚫 Message supprimé</p>
                ) : (
                  <>
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    {m.audio_path && (urls[m.audio_path] ? <audio controls src={urls[m.audio_path]} className="h-10 max-w-full" /> : <span>🎤 Chargement…</span>)}
                    {m.media_path && (
                      urls[m.media_path] ? (
                        m.media_type === "image" ? (
                          <img src={urls[m.media_path]} alt="" onClick={() => setZoom(urls[m.media_path as string])} className="max-h-64 rounded" />
                        ) : m.media_type === "video" ? (
                          <video controls src={urls[m.media_path]} className="max-h-64 rounded" />
                        ) : (
                          <a href={urls[m.media_path]} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">📎 {m.media_name ?? "Document"}</a>
                        )
                      ) : (
                        <span>📎 Chargement…</span>
                      )
                    )}
                  </>
                )}
                <div className="mt-1 text-right text-[10px] opacity-80">{m.audio_seconds ? fmt(m.audio_seconds) + " · " : ""}{time(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" className="max-h-full max-w-full" />
        </div>
      )}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setSheet(false)}>
          <div className="mx-auto w-full max-w-md rounded-t-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => photoRef.current?.click()} className="block w-full px-4 py-3 text-left text-ink-900">🖼️ Photo ou vidéo</button>
            <button onClick={() => docRef.current?.click()} className="block w-full px-4 py-3 text-left text-ink-900">📄 Document</button>
            <button onClick={() => setSheet(false)} className="block w-full px-4 py-3 text-left text-ink-600">Annuler</button>
          </div>
        </div>
      )}
      <input ref={photoRef} type="file" accept="image/*,video/*" onChange={pick} className="hidden" />
      <input ref={docRef} type="file" onChange={pick} className="hidden" />
      <footer className="flex items-center gap-2 border-t border-ink-400/20 bg-white px-3 py-3">
        {recording ? (
          <>
            <button onClick={() => stopRec(true)} className="px-2 text-ink-600">✕</button>
            <span className="flex-1 text-sm text-wine-700">● Enregistrement {fmt(secs)}</span>
            <button onClick={() => stopRec(false)} className="rounded-full bg-wine-700 px-4 py-2 text-sm text-white">Envoyer</button>
          </>
        ) : (
          <>
            <button onClick={() => setSheet(true)} disabled={busy} aria-label="Joindre un fichier" className="px-1 text-2xl text-wine-700">{busy ? "…" : "+"}</button>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Écrire un message" className="flex-1 rounded-full border border-ink-400/30 px-4 py-2 text-sm" />
            {text.trim() ? <button onClick={send} className="rounded-full bg-wine-700 px-4 py-2 text-sm text-white">Envoyer</button> : <button onClick={startRec} aria-label="Message vocal" className="rounded-full bg-wine-700 px-3 py-2 text-white">🎤</button>}
          </>
        )}
      </footer>
    </main>
  );
}
