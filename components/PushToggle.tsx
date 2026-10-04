"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type St = "load" | "off" | "on" | "denied" | "nosupport";

function toKey(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}

export default function PushToggle() {
  const [st, setSt] = useState<St>("load");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setSt("nosupport");
        return;
      }
      if (Notification.permission === "denied") {
        setSt("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSt(sub ? "on" : "off");
      } catch {
        setSt("off");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setErr("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setSt("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "") as unknown as BufferSource,
      });
      const j = sub.toJSON();
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !j.keys) throw new Error("Session introuvable");
      const { error } = await supabase.from("push_subscriptions").upsert(
        { user_id: uid, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setSt("on");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l’activation");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSt("off");
    } finally {
      setBusy(false);
    }
  }

  if (st === "load") return null;
  if (st === "nosupport") return <p className="text-xs text-ink-400">Notifications non prises en charge sur cet appareil.</p>;
  if (st === "denied") return <p className="text-xs text-ink-400">Notifications bloquées : autorise-les dans les réglages du navigateur.</p>;
  return (
    <div className="mb-3">
      <button
        onClick={st === "on" ? disable : enable}
        disabled={busy}
        className="w-full rounded-md border border-wine-100 bg-wine-50 px-4 py-2 text-sm text-wine-700 disabled:opacity-60"
      >
        {st === "on" ? "🔔 Notifications activées (toucher pour désactiver)" : "🔔 Activer les notifications"}
      </button>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
