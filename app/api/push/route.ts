import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sub = { endpoint: string; p256dh: string; auth: string };

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
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", to);
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, skipped: "nosub" });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const text = m.body
    ? String(m.body).slice(0, 120)
    : m.audio_path
    ? "🎤 Message vocal"
    : m.media_type === "image"
    ? "📷 Photo"
    : m.media_type === "video"
    ? "🎥 Vidéo"
    : "📎 Fichier";
  const msg = JSON.stringify({
    title: who?.full_name || "Nouveau message",
    body: text,
    url: `/messages/${m.conversation_id}`,
    tag: m.conversation_id,
  });
  await Promise.all(
    (subs as Sub[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          msg
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    })
  );
  return NextResponse.json({ ok: true, sent: subs.length });
}
