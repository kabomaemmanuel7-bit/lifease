"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const APP_ID = "95d2689c-f0fa-4efb-b9ad-9739654de145";

type St = "load" | "off" | "on" | "denied" | "nosupport";
type OS = {
  init: (o: Record<string, unknown>) => Promise<void>;
  login: (id: string) => Promise<void>;
  Notifications: {
    isPushSupported: () => boolean;
    requestPermission: () => Promise<void>;
  };
  User: { PushSubscription: { optedIn?: boolean; optIn: () => Promise<void>; optOut: () => Promise<void> } };
};
type W = Window & { OneSignalDeferred?: Array<(os: OS) => void | Promise<void>>; __osInit?: boolean };

function loadSdk() {
  if (document.getElementById("onesignal-sdk")) return;
  const s = document.createElement("script");
  s.id = "onesignal-sdk";
  s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  s.defer = true;
  document.head.appendChild(s);
}

function readState(os: OS): St {
  if (!os.Notifications.isPushSupported()) return "nosupport";
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return "denied";
  return os.User.PushSubscription.optedIn ? "on" : "off";
}

export default function PushToggle() {
  const [st, setSt] = useState<St>("load");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const osRef = useRef<OS | null>(null);

  useEffect(() => {
    const w = window as W;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (os: OS) => {
      if (!w.__osInit) {
        w.__osInit = true;
        await os.init({
          appId: APP_ID,
          serviceWorkerPath: "sw.js",
          serviceWorkerParam: { scope: "/" },
        });
      }
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (uid) await os.login(uid);
      osRef.current = os;
      setSt(readState(os));
    });
    loadSdk();
  }, []);

  async function enable() {
    const os = osRef.current;
    if (!os) return;
    setBusy(true);
    setErr("");
    try {
      await os.Notifications.requestPermission();
      if (Notification.permission === "denied") {
        setSt("denied");
      } else {
        await os.User.PushSubscription.optIn();
        setSt("on");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l’activation");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    const os = osRef.current;
    if (!os) return;
    setBusy(true);
    try {
      await os.User.PushSubscription.optOut();
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
