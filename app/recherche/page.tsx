'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { sortByWeightedRating, Rankable } from '@/lib/sorting';
import { getEffectiveStatus } from '@/lib/availability';

interface WorkerResult extends Rankable {
  id: string;
  metier: string;
  zone: string | null;
  status: 'disponible' | 'occupe' | 'indisponible';
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  availability_start: string | null;
  availability_end: string | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  distance?: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  disponible: 'Disponible',
  occupe: 'Occupé',
  indisponible: 'Indisponible',
};

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  disponible: 'success',
  occupe: 'warning',
  indisponible: 'neutral',
};

const RADII = [2, 5, 10, 20, 0];

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const fmt = (d: number) =>
  d < 1 ? 'moins de 1 km' : d.toFixed(1).replace('.', ',') + ' km';

function RechercheContent() {
  const searchParams = useSearchParams();
  const serviceSlug = searchParams.get('service');
  const [rows, setRows] = useState<WorkerResult[]>([]);
  const [serviceName, setServiceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [radius, setRadius] = useState(10);
  const [place, setPlace] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setServiceName(null);
      let serviceId: string | null = null;
      if (serviceSlug) {
        const { data: s } = await supabase
          .from('services')
          .select('id, name')
          .eq('slug', serviceSlug)
          .maybeSingle();
        if (!s) {
          setRows([]);
          setLoading(false);
          return;
        }
        serviceId = s.id;
        setServiceName(s.name);
      }
      let q = supabase.from('worker_profiles').select(
        `id, metier, zone, status, description, rating, rating_count,
         latitude, longitude, availability_start, availability_end,
         profile:profiles ( full_name, avatar_url )`
      );
      if (serviceId) q = q.eq('service_id', serviceId);
      const { data } = await q;
      setRows((data as unknown as WorkerResult[]) ?? []);
      setLoading(false);
    }
    load();
  }, [serviceSlug]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoMsg('Position indisponible sur cet appareil.');
      return;
    }
    setGeoMsg('Recherche de ta position…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoMsg(null);
      },
      () => setGeoMsg('Autorisation refusée. Saisis ta ville ou ton quartier.'),
      { timeout: 15000 }
    );
  }

  let list: WorkerResult[] = rows.map((w) => ({
    ...w,
    distance:
      pos && w.latitude != null && w.longitude != null
        ? km(pos.lat, pos.lng, w.latitude, w.longitude)
        : null,
  }));
  if (!pos && place.trim()) {
    const p = norm(place.trim());
    list = list.filter((w) => norm(w.zone ?? '').includes(p));
  }
  if (pos && radius > 0) {
    list = list.filter((w) => w.distance == null || w.distance <= radius);
  }
  const ranked = sortByWeightedRating(list);
  const results = pos
    ? [...ranked].sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
    : ranked;
  const eff = (w: WorkerResult) =>
    getEffectiveStatus(w.status, w.availability_start, w.availability_end);

  return (
    <div className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold text-ink-900">
            {serviceName ? `Professionnels — ${serviceName}` : 'Tous les professionnels'}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Distance estimée à vol d'oiseau. Classement basé sur la fiabilité des avis.
          </p>
        </header>

        <Card className="mb-4 p-4">
          {pos ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-ink-600">📍 Ta position sert à trier</p>
              <button onClick={() => setPos(null)} className="text-xs text-wine-700 underline">
                Désactiver
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={locate}
                className="w-full rounded-md bg-wine-700 px-4 py-2.5 text-sm font-medium text-white"
              >
                Autour de moi
              </button>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ou saisis ta ville / ton quartier"
                className="mt-3 w-full rounded-md border border-wine-100 bg-white px-3 py-2 text-sm"
              />
            </>
          )}
          {geoMsg && <p className="mt-2 text-xs text-ink-600">{geoMsg}</p>}
          {pos && (
            <div className="mt-3 flex flex-wrap gap-2">
              {RADII.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`rounded-pill px-3 py-1 text-xs font-medium ${
                    radius === r
                      ? 'bg-wine-700 text-white'
                      : 'border border-wine-100 bg-white text-ink-600'
                  }`}
                >
                  {r === 0 ? 'Tous' : `${r} km`}
                </button>
              ))}
            </div>
          )}
        </Card>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-wine-50 bg-white/60" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card className="p-8 text-center text-ink-400">
            Aucun professionnel trouvé pour l'instant.
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
                      {worker.distance != null ? (
                        <p className="mt-0.5 text-xs font-medium text-wine-700">
                          à {fmt(worker.distance)}
                        </p>
                      ) : pos ? (
                        <p className="mt-0.5 text-xs text-ink-400">distance inconnue</p>
                      ) : null}
                    </div>
                    <Badge tone={STATUS_TONE[eff(worker)] ?? 'neutral'}>
                      {STATUS_LABEL[eff(worker)] ?? eff(worker)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-wine-700">
                      {worker.rating ? worker.rating.toFixed(1) : '—'} ★
                    </span>
                    <span className="text-ink-400">({worker.rating_count ?? 0} avis)</span>
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
