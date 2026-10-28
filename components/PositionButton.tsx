'use client';

import { useState } from 'react';

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function PositionButton({ latitude, longitude, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function locate() {
    if (!navigator.geolocation) {
      setMsg('Position indisponible sur cet appareil.');
      return;
    }
    setBusy(true);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange(r2(p.coords.latitude), r2(p.coords.longitude));
        setBusy(false);
        setMsg('Position captée. Enregistre ton profil pour la sauvegarder.');
      },
      () => {
        setBusy(false);
        setMsg('Autorisation refusée ou position introuvable.');
      },
      { timeout: 15000 }
    );
  }

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-medium text-ink-900">Ma position (facultatif)</p>
      <p className="mb-2 text-xs text-ink-400">
        Seule une position approximative (environ 1 km) est conservée, jamais ton adresse exacte.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={locate}
          className="rounded-md bg-wine-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Recherche…' : latitude != null ? 'Mettre à jour ma position' : 'Utiliser ma position'}
        </button>
        {latitude != null && (
          <button
            type="button"
            onClick={() => {
              onChange(null, null);
              setMsg('Position retirée. Enregistre ton profil.');
            }}
            className="rounded-md border border-wine-200 bg-white px-3 py-2 text-xs font-medium text-wine-700"
          >
            Retirer
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-ink-600">{msg}</p>}
    </div>
  );
}
