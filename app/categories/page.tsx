"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { getCategoryIcon } from "@/lib/icons";

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
};

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name, icon")
        .order("name");
      setCategories(data ?? []);
      setLoading(false);
    }
    loadCategories();
  }, []);

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">Catégories</h1>
      </div>

      {loading && <p className="text-sm text-ink-600">Chargement…</p>}

      <div className="flex flex-col gap-3">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.icon);
          return (
            <Link key={category.id} href={`/recherche?category=${category.slug}`}>
              <Card className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                  <Icon className="h-5 w-5 text-wine-600" />
                </div>
                <span className="text-sm font-medium text-ink-900">
                  {category.name}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
