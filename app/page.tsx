"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, ClipboardList } from "lucide-react";
import { NavMenu } from "@/components/NavMenu";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { getCategoryIcon } from "@/lib/icons";

type Profile = {
  full_name: string;
  role: "client" | "travailleur" | "admin";
};

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
};

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }

      const [{ data: profileData }, { data: categoryData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("categories")
            .select("id, slug, name, icon")
            .order("name")
            .limit(4),
        ]);

      setProfile(profileData);
      setCategories(categoryData ?? []);
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

  const prenom = profile?.full_name?.split(" ")[0] || "";
  const initiale = profile?.full_name?.charAt(0).toUpperCase() || "?";

  // ---- Vue Travailleur ----
  if (profile?.role === "travailleur") {
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

          <p className="mb-1 text-sm text-ink-600">Bonjour, {prenom}</p>
          <p className="mb-6 text-base font-medium text-ink-900">
            Espace professionnel
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/travailleur/demandes">
              <Card className="flex items-center gap-3 bg-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                  <ClipboardList className="h-5 w-5 text-wine-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    Mes demandes
                  </p>
                  <p className="text-xs text-ink-600">
                    Voir et répondre aux demandes reçues
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/travailleur/profil">
              <Card className="flex items-center gap-3 bg-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                  <Briefcase className="h-5 w-5 text-wine-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    Mon profil professionnel
                  </p>
                  <p className="text-xs text-ink-600">
                    Métier, compétences, statut, disponibilité
                  </p>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- Vue Client ----
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

        <p className="mb-1 text-sm text-ink-600">Bonjour, {prenom}</p>
        <p className="mb-5 text-base font-medium text-ink-900">
          Cotonou, Bénin
        </p>

        <Link href="/recherche">
          <Card className="mb-5 flex items-center gap-2 bg-white text-ink-400">
            <span className="text-sm">Rechercher un service…</span>
          </Card>
        </Link>

        <div className="mb-6 rounded-md bg-wine-600 p-4">
          <p className="mb-1 text-sm font-medium text-white">Besoin urgent</p>
          <p className="text-xs text-wine-100">
            Trouvez un professionnel disponible rapidement
          </p>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-600">Catégories</p>
          <Link href="/categories" className="text-sm font-medium text-wine-600">
            Voir tout
          </Link>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.icon);
            return (
              <Link key={category.id} href={`/recherche?category=${category.slug}`}>
                <Card className="flex items-center gap-2 bg-white text-sm text-ink-900">
                  <Icon className="h-4 w-4 text-wine-600" />
                  {category.name}
                </Card>
              </Link>
            );
          })}
        </div>

        <Link href="/recherche">
          <Card className="bg-white text-center text-sm font-medium text-wine-600">
            Voir tous les professionnels disponibles
          </Card>
        </Link>
      </div>
    </main>
  );
}
