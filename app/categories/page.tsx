"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TILES, norm } from "@/components/CategoryGrid";
import { ALL_TILES } from "@/lib/catTiles";

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
          <div className="flex flex-col gap-3">
            {services.map((s) => {
              const big = ALL_TILES.find((t) => norm(s.name).includes(t.stem));
              const tile = big ?? TILES.find((t) => norm(s.name).includes(t.stem));
              return (
                <Link key={s.id} href={`/recherche?service=${s.slug}`} className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-md shadow-wine-800/10 transition-transform active:scale-[0.98]">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-beige-50">
                    {tile ? (
                      <img src={`/categories/${big ? "all/" : ""}${tile.file}.webp`} alt="" className="absolute left-1/2 top-0 w-[88px] max-w-none -translate-x-1/2" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-2xl">{s.icon ?? "🔧"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink-900">{s.name}</p>
                    <p className="text-sm text-ink-400">Voir les professionnels</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
