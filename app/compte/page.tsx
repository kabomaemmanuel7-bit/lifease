"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Briefcase, ClipboardList, MapPin, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  role: "client" | "travailleur" | "admin";
};

type WorkerProfile = {
  metier: string;
  status: "disponible" | "occupe" | "indisponible";
  rating: number | null;
  rating_count: number | null;
  zone: string | null;
  experience_years: number | null;
};

type RequestCounts = {
  total: number;
  en_attente: number;
  acceptee: number;
  terminee: number;
  refusee: number;
};

const STATUS_LABEL: Record<WorkerProfile["status"], string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  indisponible: "Indisponible",
};

function tallyStatuses(rows: { status: string }[]): RequestCounts {
  const result: RequestCounts = {
    total: rows.length,
    en_attente: 0,
    acceptee: 0,
    terminee: 0,
    refusee: 0,
  };
  rows.forEach((r) => {
    if (r.status === "en_attente") result.en_attente += 1;
    if (r.status === "acceptee") result.acceptee += 1;
    if (r.status === "terminee") result.terminee += 1;
    if (r.status === "refusee") result.refusee += 1;
  });
  return result;
}

export default function ComptePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [counts, setCounts] = useState<RequestCounts>({
    total: 0,
    en_attente: 0,
    acceptee: 0,
    terminee: 0,
    refusee: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      setEmail(user.email ?? null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, city, avatar_url, role")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      if (profileData?.role === "travailleur") {
        const { data: workerData } = await supabase
          .from("worker_profiles")
          .select("metier, status, rating, rating_count, zone, experience_years")
          .eq("id", user.id)
          .single();
        setWorkerProfile(workerData);

        const { data: requestRows } = await supabase
          .from("requests")
          .select("status")
          .eq("worker_id", user.id);

        setCounts(tallyStatuses(requestRows ?? []));
      } else {
        const { data: requestRows } = await supabase
          .from("requests")
          .select("status")
          .eq("client_id", user.id);

        setCounts(tallyStatuses(requestRows ?? []));
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  const initiale = profile.full_name?.charAt(0).toUpperCase() || "?";

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.push("/")} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
          <h1 className="text-lg font-medium text-ink-900">Mon compte</h1>
        </div>

        <Card className="mb-6 flex items-center gap-4 bg-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-wine-600 text-lg font-medium text-white">
            {initiale}
          </div>
          <div>
            <p className="text-base font-medium text-ink-900">{profile.full_name}</p>
            <p className="text-sm text-ink-600">
              {profile.role === "travailleur" ? "Compte professionnel" : "Compte client"}
            </p>
          </div>
        </Card>

        <Card className="mb-6 bg-white">
          <div className="flex items-center gap-3 py-1.5">
            <Mail className="h-4 w-4 text-wine-600" />
            <span className="text-sm text-ink-900">{email ?? "—"}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3 py-1.5">
              <Phone className="h-4 w-4 text-wine-600" />
              <span className="text-sm text-ink-900">{profile.phone}</span>
            </div>
          )}
          {profile.city && (
            <div className="flex items-center gap-3 py-1.5">
              <MapPin className="h-4 w-4 text-wine-600" />
              <span className="text-sm text-ink-900">{profile.city}</span>
            </div>
          )}
        </Card>

        {profile.role === "travailleur" ? (
          <>
            <p className="mb-3 text-sm font-medium text-ink-600">Tableau de bord</p>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.total}</p>
                <p className="text-xs text-ink-600">Demandes reçues</p>
              </Card>
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">
                  {workerProfile?.rating ? workerProfile.rating.toFixed(1) : "—"} ★
                </p>
                <p className="text-xs text-ink-600">
                  {workerProfile?.rating_count ?? 0} avis
                </p>
              </Card>
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.terminee}</p>
                <p className="text-xs text-ink-600">Missions terminées</p>
              </Card>
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.en_attente}</p>
                <p className="text-xs text-ink-600">En attente</p>
              </Card>
            </div>

            {workerProfile && (
              <Card className="mb-6 bg-white">
                <p className="mb-1 text-sm font-medium text-ink-900">{workerProfile.metier}</p>
                <p className="text-xs text-ink-600">
                  {STATUS_LABEL[workerProfile.status]}
                  {workerProfile.zone ? ` · ${workerProfile.zone}` : ""}
                  {workerProfile.experience_years
                    ? ` · ${workerProfile.experience_years} an(s) d'expérience`
                    : ""}
                </p>
              </Card>
            )}

            <p className="mb-3 text-sm font-medium text-ink-600">Outils</p>
            <div className="mb-6 flex flex-col gap-3">
              <Link href="/travailleur/demandes">
                <Card className="flex items-center gap-3 bg-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                    <ClipboardList className="h-5 w-5 text-wine-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">Mes demandes</p>
                    <p className="text-xs text-ink-600">Voir et répondre aux demandes reçues</p>
                  </div>
                </Card>
              </Link>

              <Link href="/travailleur/profil">
                <Card className="flex items-center gap-3 bg-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                    <Briefcase className="h-5 w-5 text-wine-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">Mon profil professionnel</p>
                    <p className="text-xs text-ink-600">Métier, compétences, statut, disponibilité</p>
                  </div>
                </Card>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-ink-600">Mon parcours</p>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.total}</p>
                <p className="text-xs text-ink-600">Demandes envoyées</p>
              </Card>
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.terminee}</p>
                <p className="text-xs text-ink-600">Interventions terminées</p>
              </Card>
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.en_attente}</p>
                <p className="text-xs text-ink-600">En attente</p>
              </Card>
              <Card className="bg-white text-center">
                <p className="text-2xl font-semibold text-wine-600">{counts.acceptee}</p>
                <p className="text-xs text-ink-600">Acceptées</p>
              </Card>
            </div>

            <Link href="/recherche">
              <Card className="mb-6 bg-white text-center text-sm font-medium text-wine-600">
                Trouver un nouveau professionnel
              </Card>
            </Link>
          </>
        )}

        <button
          onClick={handleSignOut}
          className="w-full rounded-md border border-wine-200 py-3 text-sm font-medium text-wine-700"
        >
          Déconnexion
        </button>
      </div>
    </main>
  );
}
