"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

const categories = [
  { label: "Maison" },
  { label: "Auto" },
  { label: "Tech" },
  { label: "Services" },
];

type Profile = {
  full_name: string;
  role: string;
};

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    loadUser();
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

      <Card className="mb-5 flex items-center gap-2 text-ink-400">
        <span className="text-sm">Rechercher un service…</span>
      </Card>

      <div className="mb-6 rounded-md bg-wine-600 p-4">
        <p className="mb-1 text-sm font-medium text-white">Besoin urgent</p>
        <p className="text-xs text-wine-100">
          Trouvez un professionnel disponible rapidement
        </p>
      </div>

      <p className="mb-3 text-sm font-medium text-ink-600">Catégories</p>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {categories.map((c) => (
          <Card key={c.label} className="text-sm text-ink-900">
            {c.label}
          </Card>
        ))}
      </div>

      <p className="mb-3 text-sm font-medium text-ink-600">Près de vous</p>
      <Card className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-wine-100" />
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-900">Jean K.</p>
          <p className="text-xs text-ink-600">Mécanicien · 1,3 km</p>
        </div>
        <Badge tone="success">Disponible</Badge>
      </Card>
    </main>
  );
}
