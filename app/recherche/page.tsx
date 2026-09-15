'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { sortByWeightedRating, Rankable } from '@/lib/sorting';

interface WorkerResult extends Rankable {
  id: string;
  metier: string;
  zone: string | null;
  status: 'disponible' | 'occupe' | 'indisponible';
  description: string | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  category: { name: string; slug: string } | null;
}

const STATUS_LABEL: Record<WorkerResult['status'], string> = {
  disponible: 'Disponible',
  occupe: 'Occupé',
  indisponible: 'Indisponible',
};

const STATUS_TONE: Record<WorkerResult['status'], 'success' | 'warning' | 'neutral'> = {
  disponible: 'success',
  occupe: 'warning',
  indisponible: 'neutral',
};

function RechercheContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');

  const [results, setResults] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);

      let query = supabase.from('worker_profiles').select(
        `id, metier, zone, status, description, rating, rating_count,
         profile:profiles ( full_name, avatar_url ),
         category:categories ( name, slug )`
      );

      if (category) {
        query = query.eq('category.slug', category);
      }

      const { data } = await query;
      const rows = (data as unknown as WorkerResult[]) ?? [];

      // Tri pondéré (bayésien) : privilégie les profils avec un historique
      // d'avis fiable plutôt qu'une note brute sur peu d'avis.
      const ranked = sortByWeightedRating(rows);

      setResults(ranked);
      setCategoryName(ranked[0]?.category?.name ?? category);
      setLoading(false);
    }

    fetchResults();
  }, [supabase, category]);

  return (
    <div className="min-h-screen bg-[#FAF7F6]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-ink-900">
            {categoryName ? `Professionnels — ${categoryName}` : 'Résultats de recherche'}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Classement basé sur la fiabilité des avis, pas seulement la note brute.
          </p>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-white/60 border border-wine-50"
              />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card className="p-8 text-center text-ink-400">
            Aucun professionnel trouvé dans cette catégorie pour l'instant.
          </Card>
        ) : (
          <div className="space-y-3">
            {results.map((worker) => (
              <Link key={worker.id} href={`/professionnel/${worker.id}`}>
                <Card className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-900">
                        {worker.profile?.full_name ?? 'Professionnel'}
                      </p>
                      <p className="text-sm text-ink-600">{worker.metier}</p>
                      {worker.zone && (
                        <p className="mt-0.5 text-xs text-ink-400">📍 {worker.zone}</p>
                      )}
                    </div>
                    <Badge tone={STATUS_TONE[worker.status]}>
                      {STATUS_LABEL[worker.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-wine-700">
                      {worker.rating ? worker.rating.toFixed(1) : '—'} ★
                    </span>
                    <span className="text-ink-400">
                      ({worker.rating_count ?? 0} avis)
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={null}>
      <RechercheContent />
    </Suspense>
  );
}
