'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export default function PayButton({ requestId }: { requestId: string }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
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
      body: JSON.stringify({ request_id: requestId, amount: Number(amount) }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErr(j.error || 'Échec');
    else setDone(true);
    setBusy(false);
  }

  if (done) {
    return <p className="mt-3 text-xs text-ink-600">Demande de paiement envoyée au client.</p>;
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Montant en FCFA"
        className="w-40 rounded-md border border-wine-100 bg-white px-3 py-2 text-sm"
      />
      <Button size="sm" disabled={busy || !amount} onClick={go}>
        {busy ? 'Envoi…' : 'Demander le paiement'}
      </Button>
      {err && <p className="text-xs text-wine-700">{err}</p>}
    </div>
  );
}
