'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Urgency = 'normal' | 'eleve' | 'tres_eleve';
type Status = 'en_attente' | 'acceptee' | 'refusee' | 'terminee';

interface DemandeRow {
  id: string;
  description: string;
  urgency: Urgency;
  status: Status;
  created_at: string;
  client: { full_name: string; phone: string | null; city: string | null } | null;
  category: { name: string; icon: string | null } | null;
}

const URGENCY_LABEL: Record<Urgency, string> = {
  normal: 'Normal',
  eleve: 'Élevé',
  tres_eleve: 'Très élevé',
};

const URGENCY_TONE: Record<Urgency, 'neutral' | 'warning' | 'wine'> = {
  normal: 'neutral',
  eleve: 'warning',
  tres_eleve: 'wine',
};

const STATUS_LABEL: Record<Status, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  terminee: 'Terminée',
};

const STATUS_TONE: Record<Status, 'neutral' | 'warning' | 'success' | 'wine'> = {
  en_attente: 'warning',
  acceptee: 'wine',
  refusee: 'neutral',
  terminee: 'success',
};

export default function DemandesTravailleurPage() {
  const supabase = createClient();
  const [demandes, setDemandes] = useState<DemandeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'toutes' | Status>('toutes');

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('requests')
      .select(
        `id, description, urgency, status, created_at,
         client:profiles!requests_client_id_fkey ( full_name, phone, city ),
         category:categories ( name, icon )`
      )
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError("Impossible de charger les demandes pour le moment.");
    } else {
      setDemandes((data as unknown as DemandeRow[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  async function updateStatus(id: string, status: Status) {
    setPendingId(id);
    setError(null);

    const { error: updateError } = await supabase
      .from('requests')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      setError("La mise à jour a échoué. Réessaie.");
    } else {
      setDemandes((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status } : d))
      );
    }
    setPendingId(null);
  }

  const filtered =
    filter === 'toutes' ? demandes : demandes.filter((d) => d.status === filter);

  return (
    <div className="min-h-screen bg-[#FAF7F6]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-ink-900">Mes demandes reçues</h1>
          <p className="mt-1 text-sm text-ink-400">
            Gère tes demandes d'intervention et clôture-les une fois le travail terminé.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {(['toutes', 'en_attente', 'acceptee', 'terminee', 'refusee'] as const).map(
            (key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-wine-700 text-white'
                    : 'bg-white text-ink-600 border border-wine-100 hover:bg-wine-50'
                }`}
              >
                {key === 'toutes' ? 'Toutes' : STATUS_LABEL[key]}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-wine-200 bg-wine-50 px-4 py-3 text-sm text-wine-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-white/60 border border-wine-50"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-ink-400">
            Aucune demande {filter !== 'toutes' ? `au statut "${STATUS_LABEL[filter as Status]}"` : ''} pour le moment.
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">
                      {d.client?.full_name ?? 'Client'}
                    </p>
                    <p className="text-xs text-ink-400">
                      {d.category?.name ?? 'Service'} ·{' '}
                      {new Date(d.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                    <Badge tone={URGENCY_TONE[d.urgency]}>{URGENCY_LABEL[d.urgency]}</Badge>
                  </div>
                </div>

                <p className="mt-3 text-sm text-ink-600">{d.description}</p>

                {d.client?.phone && (
                  <p className="mt-2 text-xs text-ink-400">📞 {d.client.phone}</p>
                )}

                <div className="mt-4 flex gap-2">
                  {d.status === 'en_attente' && (
                    <>
                      <Button
                        size="sm"
                        disabled={pendingId === d.id}
                        onClick={() => updateStatus(d.id, 'acceptee')}
                      >
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pendingId === d.id}
                        onClick={() => updateStatus(d.id, 'refusee')}
                      >
                        Refuser
                      </Button>
                    </>
                  )}

                  {d.status === 'acceptee' && (
                    <Button
                      size="sm"
                      disabled={pendingId === d.id}
                      onClick={() => updateStatus(d.id, 'terminee')}
                    >
                      {pendingId === d.id ? 'Mise à jour…' : 'Marquer comme terminée'}
                    </Button>
                  )}

                  {d.status === 'terminee' && (
                    <p className="text-xs font-medium text-green-700">
                      ✓ Intervention clôturée — le client peut maintenant te noter.
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
