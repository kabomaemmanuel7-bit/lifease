"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { getCategoryIcon } from "@/lib/icons";

type Profile = {
  full_name: string;
  role: string;
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  const prenom = profile?.full_name?.split(" ")[0] || "";
  const initiale = profile?.full_name?.charAt(0).toUpperCase() || "?";

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <button
          onClick={handleSignOut}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-600 text-sm font-medium text-white"
          aria-label="Se déconnecter"
        >
          {initiale}
        </button>
      </div>

      <p className="mb-1 text-sm text-ink-600">Bonjour, {prenom}</p>
      <p className="mb-5 text-base font-medium text-ink-900">
        Cotonou, Bénin
      </p>

      <Link href="/recherche">
        <Card className="mb-5 flex items-center gap-2 text-ink-400">
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
              <Card className="flex items-center gap-2 text-sm text-ink-900">
                <Icon className="h-4 w-4 text-wine-600" />
                {category.name}
              </Card>
            </Link>
          );
        })}
      </div>

      <Link href="/recherche">
        <Card className="text-center text-sm font-medium text-wine-600">
          Voir tous les professionnels disponibles
        </Card>
      </Link>
    </main>
  );
}
