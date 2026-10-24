'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

type Pay = { id: string; amount: number; payment_url: string | null };

export default function PaymentPrompt() {
  const [uid, setUid] = useState<string | null>(null);
  const [pay, setPay] = useState<Pay | null>(null);
  const [later, setLater] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUid(user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUid(s?.user?.id ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      setPay(null);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, payment_url')
        .eq('client_id', uid)
        .eq('status', 'en_attente')
        .order('created_at', { ascending: false })
        .limit(1);
      setPay(data && data.length ? (data[0] as Pay) : null);
    };
    load();
    const ch = supabase
      .channel('pay-' + uid)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: 'client_id=eq.' + uid },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  async function refuse() {
    if (!pay) return;
    setBusy(true);
    await supabase.rpc('refuse_payment', { p_id: pay.id });
    setPay(null);
    setBusy(false);
  }

  if (!pay || later === pay.id) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink-900">Paiement demandé</h2>
        <p className="mt-2 text-sm text-ink-600">Le professionnel vous demande de régler :</p>
        <p className="mt-3 text-3xl font-semibold text-wine-700">
          {pay.amount.toLocaleString('fr-FR')} FCFA
        </p>
        <p className="mt-2 text-xs text-ink-400">
          Vous choisirez votre opérateur sur la page de paiement sécurisée FedaPay.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            disabled={busy || !pay.payment_url}
            onClick={() => pay.payment_url && window.location.assign(pay.payment_url)}
          >
            Payer
          </Button>
          <Button variant="ghost" disabled={busy} onClick={refuse}>
            Refuser
          </Button>
          <button onClick={() => setLater(pay.id)} className="text-xs text-ink-400 underline">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
