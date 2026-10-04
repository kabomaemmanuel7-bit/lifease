import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_ID = "95d2689c-f0fa-4efb-b9ad-9739654de145";
const SITE = "https://lifease-orpin.vercel.app";

export async function POST(req: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = await req.json();
  const m = payload?.record;
  if (payload?.type !== "INSERT" || !m || m.deleted_at) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: conv } = await db
    .from("conversations")
    .select("user_a,user_b")
    .eq("id", m.conversation_id)
    .maybeSingle();
  if (!conv) return NextResponse.json({ ok: true, skipped: "conv" });
  const to = conv.user_a === m.sender_id ? conv.user_b : conv.user_a;
  const { data: who } = await db
    .from("worker_directory")
    .select("full_name")
    .eq("id", m.sender_id)
    .maybeSingle();
  const text = m.body
    ? String(m.body).slice(0, 120)
    : m.audio_path
    ? "🎤 Message vocal"
    : m.media_type === "image"
    ? "📷 Photo"
    : m.media_type === "video"
    ? "🎥 Vidéo"
    : "📎 Fichier";
  const res = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: APP_ID,
      target_channel: "push",
      include_aliases: { external_id: [to] },
      headings: { en: who?.full_name || "Nouveau message" },
      contents: { en: text },
      url: `${SITE}/messages/${m.conversation_id}`,
    }),
  });
  const out = await res.text();
  return NextResponse.json({ ok: res.ok, status: res.status, out });
}
