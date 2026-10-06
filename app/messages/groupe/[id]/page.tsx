"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null };
type Msg = { id: string; sender_id: string; body: string | null; audio_path: string | null; audio_seconds: number | null; media_path: string | null; media_type: string | null; media_name: string | null; reply_to: string | null; created_at: string; deleted_at: string | null };
type Reaction = { message_id: string; conversation_id: string; user_id: string; emoji: string };

const COLS = "id, sender_id, body, audio_path, audio_seconds, media_path, media_type, media_name, reply_to, created_at, deleted_at";
const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [name, setName] = useState("Groupe");
  const [count, setCount] = useState(0);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reacts, setReacts] = useState<Reaction[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<Msg | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [selMode, setSelMode] = useState(false);
  const [delIds, setDelIds] = useState<string[] | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [viewer, setViewer] = useState<{ url: string; kind: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);
  const secsRef = useRef(0);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyRef = useRef<string | null>(null);

  const addMsg = useCallback((m: Msg) => {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
  }, []);

  useEffect(() => { replyRef.current = replyTo?.id ?? null; }, [replyTo]);

  useEffect(() => {
    if (!viewer) return;
    const onPop = () => setViewer(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [viewer]);

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
      const { data: rs } = await supabase.from("message_reactions").select("*").eq("conversation_id", id);
      setReacts((rs ?? []) as Reaction[]);
      const { data: hs } = await supabase.from("message_hidden").select("message_id");
      setHidden((hs ?? []).map((x) => x.message_id as string));
      channel = supabase
        .channel("grp-" + id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (p) => addMsg(p.new as Msg))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: "conversation_id=eq." + id }, (p) => addMsg(p.new as Msg))
        .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions", filter: "conversation_id=eq." + id }, (p) => {
          if (p.eventType === "DELETE") {
            const o = p.old as Reaction;
            setReacts((prev) => prev.filter((r) => !(r.message_id === o.message_id && r.user_id === o.user_id)));
          } else {
            const r = p.new as Reaction;
            setReacts((prev) => [...prev.filter((x) => !(x.message_id === r.message_id && x.user_id === r.user_id)), r]);
          }
        })
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
    const reply = replyRef.current;
    setReplyTo(null);
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body, reply_to: reply }).select().single();
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
    const reply = replyRef.current;
    setReplyTo(null);
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, audio_path: path, audio_seconds: secsRef.current, reply_to: reply }).select().single();
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
    const reply = replyRef.current;
    setReplyTo(null);
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, media_path: path, media_type: kind, media_name: file.name, reply_to: reply }).select().single();
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

  function pressStart(m: Msg) {
    if (m.deleted_at || selMode) return;
    pressRef.current = setTimeout(() => setMenu(m), 450);
  }

  function pressEnd() {
    if (pressRef.current) clearTimeout(pressRef.current);
  }

  function toggleSel(mid: string) {
    const next = sel.includes(mid) ? sel.filter((x) => x !== mid) : [...sel, mid];
    setSel(next);
    if (next.length === 0) setSelMode(false);
  }

  function startSelect(m: Msg) {
    setMenu(null);
    setSelMode(true);
    setSel([m.id]);
  }

  function stopSelect() {
    setSelMode(false);
    setSel([]);
  }

  async function react(m: Msg, emoji: string) {
    setMenu(null);
    if (!me) return;
    const mineR = reacts.find((r) => r.message_id === m.id && r.user_id === me);
    if (mineR && mineR.emoji === emoji) {
      setReacts((prev) => prev.filter((r) => r !== mineR));
      await supabase.from("message_reactions").delete().eq("message_id", m.id).eq("user_id", me);
      return;
    }
    const row: Reaction = { message_id: m.id, conversation_id: id, user_id: me, emoji };
    setReacts((prev) => [...prev.filter((r) => !(r.message_id === m.id && r.user_id === me)), row]);
    const { error: err } = await supabase.from("message_reactions").upsert(row);
    if (err) setError("Réaction impossible : " + err.message);
  }

  async function copyMsgs(ids: string[]) {
    const t = msgs.filter((m) => ids.includes(m.id) && m.body && !m.deleted_at).map((m) => m.body).join("\n");
    setMenu(null);
    stopSelect();
    if (!t) return;
    try { await navigator.clipboard.writeText(t); } catch { setError("Copie impossible."); }
  }

  async function hideForMe(ids: string[]) {
    setDelIds(null);
    stopSelect();
    if (!me || ids.length === 0) return;
    const { error: err } = await supabase.from("message_hidden").upsert(ids.map((mid) => ({ message_id: mid, user_id: me })));
    if (err) { setError("Suppression impossible : " + err.message); return; }
    setHidden((prev) => [...prev, ...ids]);
  }

  async function deleteAll(ids: string[]) {
    setDelIds(null);
    stopSelect();
    setError("");
    for (const m of msgs.filter((x) => ids.includes(x.id) && x.sender_id === me && !x.deleted_at)) {
      if (m.audio_path) await supabase.storage.from("voice").remove([m.audio_path]);
      if (m.media_path) await supabase.storage.from("chatfiles").remove([m.media_path]);
      const { data, error: err } = await supabase.from("messages").update({ body: null, audio_path: null, audio_seconds: null, media_path: null, media_type: null, media_name: null, deleted_at: new Date().toISOString() }).eq("id", m.id).select().single();
      if (err) { setError("Suppression impossible : " + err.message); return; }
      addMsg(data as Msg);
    }
  }

  function openMedia(m: Msg) {
    const u = m.media_path ? urls[m.media_path] : "";
    if (u) { history.pushState(null, ""); setViewer({ url: u, kind: m.media_type ?? "file", name: m.media_name ?? "fichier" }); }
  }

  const who = (uid: string) => people[uid]?.full_name ?? "Membre";
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const time = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const reactLine = (mid: string) => {
    const c: Record<string, number> = {};
    reacts.filter((r) => r.message_id === mid).forEach((r) => { c[r.emoji] = (c[r.emoji] ?? 0) + 1; });
    return Object.entries(c).map(([e, n]) => e + (n > 1 ? " " + n : "")).join("  ");
  };
  const preview = (m: Msg | undefined) => (!m ? "Message" : m.deleted_at ? "🚫 Message supprimé" : m.body ?? (m.media_path ? (m.media_type === "image" ? "📷 Photo" : m.media_type === "video" ? "🎥 Vidéo" : "📎 " + (m.media_name ?? "Document")) : "🎤 Message vocal"));
  const visible = msgs.filter((m) => !hidden.includes(m.id));
  const canAll = !!delIds && delIds.every((mid) => { const x = msgs.find((y) => y.id === mid); return !!x && x.sender_id === me && !x.deleted_at; });

  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">{error || "Chargement…"}</main>;

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col bg-beige-50">
      {selMode ? (
        <header className="flex items-center gap-3 border-b border-ink-400/20 bg-white px-4 py-3">
          <button onClick={stopSelect} className="text-ink-600">✕</button>
          <p className="flex-1 font-medium text-ink-900">{sel.length} sélectionné{sel.length > 1 ? "s" : ""}</p>
          <button onClick={() => copyMsgs(sel)} aria-label="Copier" className="px-2 text-xl">📋</button>
          <button onClick={() => setDelIds(sel)} aria-label="Supprimer" className="px-2 text-xl">🗑️</button>
        </header>
      ) : (
        <header className="flex items-center gap-3 border-b border-ink-400/20 bg-white px-4 py-3">
          <Link href="/messages" className="text-ink-600">←</Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-700 text-white">👥</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-tight text-ink-900">{name}</p>
            <p className="text-xs text-ink-400">{count} membres</p>
          </div>
        </header>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {visible.map((m) => {
          const mine = m.sender_id === me;
          const rl = reactLine(m.id);
          const q = m.reply_to ? msgs.find((x) => x.id === m.reply_to) : undefined;
          const on = sel.includes(m.id);
          return (
            <div key={m.id} onClick={() => { if (selMode) toggleSel(m.id); }} className={"flex items-center rounded " + (on ? "bg-wine-100" : "")}>
              {selMode && <span className={"mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] " + (on ? "border-wine-700 bg-wine-700 text-white" : "border-ink-400/40")}>{on ? "✓" : ""}</span>}
              <div className="min-w-0 flex-1">
                <div className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    onTouchStart={() => pressStart(m)}
                    onTouchEnd={pressEnd}
                    onTouchMove={pressEnd}
                    onContextMenu={(e) => { e.preventDefault(); if (!m.deleted_at && !selMode) setMenu(m); }}
                    className={"max-w-[80%] select-none rounded-md px-3 py-2 text-sm " + (mine ? "bg-wine-700 text-white" : "bg-white text-ink-900 shadow-sm")}
                  >
                    {!mine && <p className="mb-0.5 text-xs font-medium text-wine-700">{who(m.sender_id)}</p>}
                    {m.reply_to && !m.deleted_at && (
                      <div className={"mb-1 rounded border-l-4 px-2 py-1 text-xs " + (mine ? "border-white/60 bg-white/15" : "border-wine-700 bg-beige-50")}>
                        <p className="font-medium">{q ? (q.sender_id === me ? "Toi" : who(q.sender_id)) : "Message"}</p>
                        <p className="truncate opacity-80">{preview(q)}</p>
                      </div>
                    )}
                    {m.deleted_at ? (
                      <p className="italic opacity-70">🚫 Message supprimé</p>
                    ) : (
                      <>
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        {m.audio_path && (urls[m.audio_path] ? <audio controls src={urls[m.audio_path]} className="h-10 max-w-full" /> : <span>🎤 Chargement…</span>)}
                        {m.media_path && (
                          urls[m.media_path] ? (
                            m.media_type === "image" ? (
                              <img src={urls[m.media_path]} alt="" draggable={false} onClick={() => { if (!selMode) openMedia(m); }} className="max-h-64 rounded" />
                            ) : m.media_type === "video" ? (
                              <div className="relative" onClick={() => { if (!selMode) openMedia(m); }}>
                                <video src={urls[m.media_path]} preload="metadata" className="pointer-events-none max-h-64 rounded" />
                                <span className="absolute inset-0 flex items-center justify-center text-4xl text-white">▶</span>
                              </div>
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
                {rl && !m.deleted_at && (
                  <div className={"flex " + (mine ? "justify-end" : "justify-start")}>
                    <span className="-mt-1 rounded-full bg-white px-2 py-0.5 text-xs shadow-sm">{rl}</span>
                  </div>
                )}
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
            <div className="flex justify-around px-2 pb-2">
              {EMOJIS.map((em) => (
                <button key={em} onClick={() => react(menu, em)} className="text-2xl">{em}</button>
              ))}
            </div>
            <button onClick={() => { setReplyTo(menu); setMenu(null); }} className="block w-full px-4 py-3 text-left text-ink-900">↩️ Répondre</button>
            {menu.body && <button onClick={() => copyMsgs([menu.id])} className="block w-full px-4 py-3 text-left text-ink-900">📋 Copier</button>}
            <button onClick={() => startSelect(menu)} className="block w-full px-4 py-3 text-left text-ink-900">☑️ Sélectionner</button>
            <button onClick={() => { setDelIds([menu.id]); setMenu(null); }} className="block w-full px-4 py-3 text-left text-wine-700">🗑️ Supprimer</button>
            <button onClick={() => setMenu(null)} className="block w-full px-4 py-3 text-left text-ink-600">Annuler</button>
          </div>
        </div>
      )}
      {delIds && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setDelIds(null)}>
          <div className="mx-auto w-full max-w-md rounded-t-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 px-4 pt-2 text-sm text-ink-600">Supprimer {delIds.length > 1 ? delIds.length + " messages" : "ce message"} ?</p>
            <button onClick={() => hideForMe(delIds)} className="block w-full px-4 py-3 text-left text-ink-900">Supprimer pour moi</button>
            {canAll && <button onClick={() => deleteAll(delIds)} className="block w-full px-4 py-3 text-left text-wine-700">Supprimer pour tout le monde</button>}
            <button onClick={() => setDelIds(null)} className="block w-full px-4 py-3 text-left text-ink-600">Annuler</button>
          </div>
        </div>
      )}
      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <button onClick={() => history.back()} className="text-2xl">✕</button>
            <a href={viewer.url} download={viewer.name} target="_blank" rel="noreferrer" className="text-2xl">⬇️</a>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            {viewer.kind === "video" ? <video src={viewer.url} controls autoPlay playsInline className="max-h-full max-w-full" /> : <img src={viewer.url} alt="" className="max-h-full max-w-full object-contain" />}
          </div>
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
      {replyTo && !selMode && (
        <div className="flex items-center justify-between gap-3 border-t border-ink-400/20 bg-beige-200 px-4 py-2 text-sm text-ink-600">
          <span className="truncate">↩️ {replyTo.sender_id === me ? "Toi" : who(replyTo.sender_id)} : {preview(replyTo)}</span>
          <button onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}
      <footer style={{ display: selMode ? "none" : undefined }} className="flex items-center gap-2 border-t border-ink-400/20 bg-white px-3 py-3">
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
