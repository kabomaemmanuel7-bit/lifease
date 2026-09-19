"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { NavMenu } from "@/components/NavMenu";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { getServiceIcon } from "@/lib/icons";

type Profile = {
  full_name: string;
  role: "client" | "travailleur" | "admin";
};

type ServiceItem = {
  id: string;
  slug: string;
  name: string;
  icon: string;
};

type RecommendedWorker = {
  id: string;
  metier: string;
  zone: string | null;
  status: "disponible" | "occupe" | "indisponible";
  rating: number;
  rating_count: number;
  full_name: string;
};

type Slide = {
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
};

const statusTone: Record<RecommendedWorker["status"], "success" | "warning" | "neutral"> = {
  disponible: "success",
  occupe: "warning",
  indisponible: "neutral",
};

const statusLabel: Record<RecommendedWorker["status"], string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  indisponible: "Indisponible",
};

const FALLBACK_SLIDES: Slide[] = [
  {
    title: "Besoin d'un pro rapidement ?",
    subtitle: "Des professionnels vérifiés, disponibles près de chez vous.",
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

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedWorker[]>([]);
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

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
            .select("full_name, role")
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("services")
            .select("id, slug, name, icon")
            .order("name")
            .limit(4),
          supabase
            .from("banner_slides")
            .select("image_url, title, subtitle")
            .eq("active", true)
            .order("position"),
        ]);

      setProfile(profileData);
      setServices(serviceData ?? []);

      if (bannerData && bannerData.length > 0) {
        setSlides(bannerData);
      }

      const { data: workers } = await supabase
        .from("worker_profiles")
        .select("id, metier, zone, status, rating, rating_count")
        .order("rating", { ascending: false })
        .limit(5);

      if (workers && workers.length > 0) {
        const ids = workers.map((w) => w.id);
        const { data: workerProfilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);

        const nameById = new Map(
          (workerProfilesData ?? []).map((p) => [p.id, p.full_name])
        );

        setRecommended(
          workers.map((w) => ({
            ...w,
            full_name: nameById.get(w.id) ?? "Professionnel",
          }))
        );
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  const initiale = profile?.full_name?.charAt(0).toUpperCase() || "?";
  const currentSlide = slides[slide] ?? slides[0];

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NavMenu />
            <span className="text-xl font-medium tracking-tight text-wine-600">
              LifEase
            </span>
          </div>
          <Link
            href="/compte"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-600 text-sm font-medium text-white"
            aria-label="Mon compte"
          >
            {initiale}
          </Link>
        </div>

        <div
          className="mb-6 overflow-hidden rounded-lg p-6"
          style={
            currentSlide?.image_url
              ? {
                  backgroundImage: `linear-gradient(rgba(43,12,19,0.55), rgba(43,12,19,0.55)), url(${currentSlide.image_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className={currentSlide?.image_url ? "" : "bg-gradient-to-br from-wine-600 to-wine-800 -m-6 p-6"}>
            {currentSlide?.title && (
              <p className="mb-2 text-lg font-semibold text-white">
                {currentSlide.title}
              </p>
            )}
            {currentSlide?.subtitle && (
              <p className="mb-4 text-sm text-wine-100">
                {currentSlide.subtitle}
              </p>
            )}
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Voir le message ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mb-3 text-base font-medium text-ink-900">
          Que recherchez-vous ?
        </p>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) router.push(`/recherche?service=${e.target.value}`);
          }}
          className="mb-6 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
        >
          <option value="">Choisissez un service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-600">Services</p>
          <Link href="/services" className="text-sm font-medium text-wine-600">
            Voir tout
          </Link>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {services.map((s) => {
            const Icon = getServiceIcon(s.icon);
            return (
              <Link key={s.id} href={`/recherche?service=${s.slug}`}>
                <Card className="flex items-center gap-2 bg-white text-sm text-ink-900">
                  <Icon className="h-4 w-4 text-wine-600" />
                  {s.name}
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-medium text-ink-900">
            Professionnels recommandés
          </p>
          <Link href="/recherche" className="text-sm font-medium text-wine-600">
            Voir tout
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {recommended.length === 0 && (
            <Card className="bg-white text-center text-sm text-ink-600">
              Aucun professionnel disponible pour le moment.
            </Card>
          )}
          {recommended.map((worker) => (
            <Link key={worker.id} href={`/professionnel/${worker.id}`}>
              <Card className="flex items-center gap-3 bg-white">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine-600 text-sm font-medium text-white">
                  {worker.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {worker.full_name}
                  </p>
                  <p className="truncate text-xs text-ink-600">
                    {worker.metier}
                    {worker.zone ? ` · ${worker.zone}` : ""}
                  </p>
                  {worker.rating_count > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-600">
                      <Star className="h-3 w-3 fill-wine-600 text-wine-600" />
                      {worker.rating.toFixed(1)} ({worker.rating_count})
                    </p>
                  )}
                </div>
                <Badge tone={statusTone[worker.status]}>
                  {statusLabel[worker.status]}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
