"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let skip = false;
    try {
      skip = sessionStorage.getItem("lifease_splash") === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sessionStorage.setItem("lifease_splash", "1");
    } catch {}
    if (skip) { setShow(false); return; }
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="lf-splash" aria-hidden="true">
      <style>{`
        .lf-splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:linear-gradient(160deg,#0B6B34,#064E25);animation:lfOut .5s ease 1.7s forwards}
        .lf-logo{animation:lfIn .9s cubic-bezier(.2,.8,.2,1) both}
        .lf-name{font-size:34px;font-weight:700;letter-spacing:-0.02em;color:#fff;animation:lfIn .9s cubic-bezier(.2,.8,.2,1) .25s both}
        .lf-tag{font-size:13px;color:#BBF7D0;animation:lfIn .9s ease .6s both}
        @keyframes lfIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
        @keyframes lfOut{to{opacity:0;visibility:hidden}}
      `}</style>
      <img className="lf-logo" src="/icons/icon-512.png" width="112" height="112" alt="LifEase" style={{ borderRadius: 26, boxShadow: "0 10px 30px rgba(0,0,0,.35)" }} />
      <div className="lf-name">LifEase</div>
      <div className="lf-tag">Trouvez. Contactez. Réparez.</div>
    </div>
  );
}
