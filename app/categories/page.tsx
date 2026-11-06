"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TILES, norm } from "@/components/CategoryGrid";

type Service = { id: string; slug: string; name: string; icon: string | null };

export default function CategoriesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("services").select("id, slug, name, icon").order("name").then(({ data }) => {
      setServices(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/" aria-label="Retour" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
            <ArrowLeft className="h-5 w-5 text-wine-700" />
          </Link>
          <h1 className="text-xl font-bold text-ink-900">Toutes les catégories</h1>
        </div>
        {loading ? (
          <p className="text-sm text-ink-600">Chargement…</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {services.map((s) => {
              const tile = TILES.find((t) => norm(s.name).includes(t.stem));
              return (
                <Link key={s.id} href={`/recherche?service=${s.slug}`} className="block overflow-hidden rounded-[22px] bg-white shadow-md shadow-wine-800/10 transition-transform active:scale-95">
                  {tile ? (
                    <img src={`/categories/${tile.file}.webp`} alt={s.name} className="block w-full" />
                  ) : (
                    <div className="flex aspect-[167/142] flex-col items-center justify-center gap-1 p-2 text-center">
                      <span className="text-3xl">{s.icon ?? "🔧"}</span>
                      <span className="text-xs font-semibold text-ink-900">{s.name}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
