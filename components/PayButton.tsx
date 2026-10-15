'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export default function PayButton({ requestId }: { requestId: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (session?.access_token ?? ''),
      },
      body: JSON.stringify({ request_id: requestId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErr(j.error || 'Échec');
    else setUrl(j.url);
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <Button size="sm" disabled={busy || !!url} onClick={go}>
        {busy ? 'Envoi…' : 'Confirmer la fin du travail'}
      </Button>
      {err && <p className="mt-2 text-xs text-wine-700">{err}</p>}
      {url && (
        <p className="mt-2 text-xs text-ink-600">
          Demande de paiement créée. Lien de test :{' '}
          <a href={url} className="underline">ouvrir</a>
        </p>
      )}
    </div>
  );
}
