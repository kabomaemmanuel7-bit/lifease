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
      <svg className="lf-logo" width="96" height="96" viewBox="0 0 34 34" role="img" aria-label="LifEase">
        <path d="M17 2C10.4 2 5 7.4 5 14c0 9 12 18 12 18s12-9 12-18c0-6.6-5.4-12-12-12z" fill="#fff" />
        <path d="M17 9c-3 0-4.5 2.2-4.5 4.3 0 1.6 1 2.7 2.3 3.6-1.6.3-3 1.3-3 3.1h2c0-1.2 1.3-1.8 3.2-1.8s3.2.6 3.2 1.8h2c0-1.8-1.4-2.8-3-3.1 1.3-.9 2.3-2 2.3-3.6C21.5 11.2 20 9 17 9z" fill="#0B6B34" />
      </svg>
      <div className="lf-name">LifEase</div>
      <div className="lf-tag">Trouvez. Contactez. Réparez.</div>
    </div>
  );
}
