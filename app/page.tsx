"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Search, ArrowRight, MapPin, Zap } from "lucide-react";
import { NavMenu } from "@/components/NavMenu";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { getEffectiveStatus } from "@/lib/availability";

type Profile = {
  full_name: string;
  role: "client" | "travailleur" | "admin";
  city: string | null;
};

type ServiceItem = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type Worker = {
  id: string;
  metier: string;
  zone: string | null;
  status: "disponible" | "occupe" | "indisponible";
  availability_start: string | null;
  availability_end: string | null;
  rating: number;
  rating_count: number;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  full_name: string;
};

type Slide = {
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
};

const statusTone: Record<Worker["status"], "success" | "warning" | "neutral"> = {
  disponible: "success",
  occupe: "warning",
  indisponible: "neutral",
};

const statusLabel: Record<Worker["status"], string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  indisponible: "Indisponible",
};

const FALLBACK_SLIDES: Slide[] = [
  {
    title: "Besoin d'un pro rapidement ?",
    subtitle: "Des professionnels disponibles près de chez vous.",
    image_url: null,
  },
  {
    title: "Paiement en toute confiance",
    subtitle: "Vous ne payez qu'une fois la mission terminée à votre satisfaction.",
    image_url: null,
  },
  {
    title: "Des avis vérifiés",
    subtitle: "Choisissez vos professionnels grâce aux notes et avis clients.",
    image_url: null,
  },
];

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const fmt = (d: number) =>
  d < 1 ? "moins de 1 km" : d.toFixed(1).replace(".", ",") + " km";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const isEmoji = (s: string | null) =>
  !!s && s.length <= 4 && !/^[a-z-]+$/i.test(s);

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }

      const [{ data: profileData }, { data: serviceData }, { data: bannerData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, role, city")
            .eq("id", session.user.id)
            .single(),
          supabase.from("services").select("id, slug, name, icon").order("name"),
          supabase
            .from("banner_slides")
            .select("image_url, title, subtitle")
            .eq("active", true)
            .order("position"),
        ]);

      setProfile(profileData);
      setServices(serviceData ?? []);
      if (bannerData && bannerData.length > 0) setSlides(bannerData);

      const { data: rows } = await supabase
        .from("worker_profiles")
        .select(
          "id, metier, zone, status, availability_start, availability_end, rating, rating_count, avatar_url, latitude, longitude"
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(200);

      if (rows && rows.length > 0) {
        const { data: names } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", rows.map((w) => w.id));
        const nameById = new Map((names ?? []).map((p) => [p.id, p.full_name]));
        setWorkers(
          rows.map((w) => ({
            ...w,
            full_name: nameById.get(w.id) ?? "Professionnel",
          })) as Worker[]
        );
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoMsg("Position indisponible sur cet appareil.");
      return;
    }
    setGeoMsg("Recherche de ta position…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoMsg(null);
      },
      () => setGeoMsg("Autorisation refusée. La recherche reste disponible ci-dessus."),
      { timeout: 15000 }
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = norm(query.trim());
    if (q.length < 3) return;
    const stem = q.length > 5 ? q.slice(0, 5) : q;
    const found = services.find((s) => norm(s.name).includes(stem));
    if (found) router.push(`/recherche?service=${found.slug}`);
    else setSearchMsg("Aucun métier ne correspond. Choisis une catégorie ci-dessous.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  const initiale = profile?.full_name?.charAt(0).toUpperCase() || "?";
  const currentSlide = slides[slide] ?? slides[0];
  const onPhoto = !!currentSlide?.image_url;
  const shown = services.slice(0, 7);
  const nearby: (Worker & { distance: number })[] = pos
    ? workers
        .map((w) => ({ ...w, distance: km(pos.lat, pos.lng, w.latitude, w.longitude) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
    : [];

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md pb-6">
        <section className="rounded-b-[2rem] bg-[#141414] px-5 pb-6 pt-6 text-white">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-beige-50">
                <NavMenu />
              </div>
              <span className="text-2xl font-semibold tracking-tight text-beige-50">LifEase</span>
            </div>
            <Link
              href={profile?.role === "travailleur" ? "/travailleur/mon-profil" : "/compte"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-beige-50 text-sm font-semibold text-[#141414]"
              aria-label="Mon compte"
            >
              {initiale}
            </Link>
          </div>
          <p className="mb-1 flex items-center gap-1 text-sm text-beige-200">
            <MapPin className="h-4 w-4" />
            {profile?.city ? `${profile.city}, Bénin` : "Bénin"}
          </p>
          <h1 className="mb-5 text-3xl font-semibold leading-tight">
            Quel service vous faut-il <span className="text-beige-200">aujourd'hui ?</span>
          </h1>
          <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4">
            <Search className="h-5 w-5 shrink-0 text-ink-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchMsg(null);
              }}
              placeholder="Ex. Plombier, électricien…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none"
            />
            <button
              type="submit"
              aria-label="Rechercher"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#141414] text-white"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
          {searchMsg && <p className="mt-2 text-xs text-beige-200">{searchMsg}</p>}
          <Link href="/recherche" className="mt-4 flex items-center justify-center gap-2 text-sm text-beige-200">
            <Zap className="h-4 w-4" />
            Rechercher un professionnel près de chez vous
          </Link>
        </section>

        <section className="px-5 pt-5">
          <div
            className="rounded-2xl bg-white p-4 shadow-sm"
            style={
              onPhoto
                ? {
                    backgroundImage: `linear-gradient(rgba(20,20,20,0.6), rgba(20,20,20,0.6)), url(${currentSlide.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {currentSlide?.title && (
              <p className={`text-sm font-semibold ${onPhoto ? "text-white" : "text-ink-900"}`}>
                {currentSlide.title}
              </p>
            )}
            {currentSlide?.subtitle && (
              <p className={`mt-1 text-xs ${onPhoto ? "text-beige-200" : "text-ink-600"}`}>
                {currentSlide.subtitle}
              </p>
            )}
            <div className="mt-3 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Voir le message ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slide ? (onPhoto ? "w-6 bg-white" : "w-6 bg-[#141414]") : "w-1.5 bg-[#9ca3af]"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Nos catégories</h2>
            <Link href="/services" className="flex items-center gap-1 text-sm font-medium text-ink-900">
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {shown.map((s) => (
              <Link
                key={s.id}
                href={`/recherche?service=${s.slug}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-1 py-3 text-center shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-beige-200 text-xl text-ink-900">
                  {isEmoji(s.icon) ? s.icon : s.name.charAt(0).toUpperCase()}
                </span>
                <span className="w-full truncate text-[11px] font-medium text-ink-900">{s.name}</span>
              </Link>
            ))}
            <Link
              href="/services"
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-1 py-3 text-center shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-beige-200 text-xl text-ink-900">
                …
              </span>
              <span className="text-[11px] font-medium text-ink-900">Autres</span>
            </Link>
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Professionnels à proximité</h2>
            <Link href="/recherche" className="flex items-center gap-1 text-sm font-medium text-ink-900">
              Voir tout <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!pos ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-ink-600">
                Active ta position pour voir les professionnels autour de toi.
              </p>
              <button
                onClick={locate}
                className="mt-3 rounded-full bg-[#141414] px-5 py-2.5 text-sm font-medium text-white"
              >
                Autour de moi
              </button>
              {geoMsg && <p className="mt-2 text-xs text-ink-600">{geoMsg}</p>}
            </div>
          ) : nearby.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center text-sm text-ink-600 shadow-sm">
              Aucun professionnel n'a encore indiqué sa position.
            </div>
          ) : (
            <div className="space-y-3">
              {nearby.map((w) => {
                const st = getEffectiveStatus(w.status, w.availability_start, w.availability_end);
                return (
                  <div key={w.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#141414]">
                      {w.avatar_url ? (
                        <img src={w.avatar_url} alt={w.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-semibold text-beige-50">
                          {w.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {w.full_name} · {w.metier}
                      </p>
                      <div className="mt-1">
                        <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-ink-600">
                        <MapPin className="h-3 w-3" /> à {fmt(w.distance)}
                        {w.rating_count > 0 && (
                          <>
                            <span>·</span>
                            <Star className="h-3 w-3 fill-[#141414] text-[#141414]" />
                            {w.rating.toFixed(1)} ({w.rating_count})
                          </>
                        )}
                      </p>
                      <Link
                        href={`/professionnel/${w.id}`}
                        className="mt-2 block rounded-full bg-[#141414] py-2 text-center text-xs font-medium text-white"
                      >
                        Voir le profil
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
