"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Sub = { id: string; name: string };

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState("");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("services").select("name").eq("slug", slug).single();
      setTitle(s?.name ?? "");
      const { data } = await supabase.from("sub_services").select("id, name").eq("service_slug", slug).order("name");
      setSubs(data ?? []);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/categories" aria-label="Retour" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
            <ArrowLeft className="h-5 w-5 text-wine-700" />
          </Link>
          <h1 className="text-xl font-bold text-ink-900">{title}</h1>
        </div>
        {loading ? <p className="text-sm text-ink-600">Chargement…</p> : (
          <div className="flex flex-col gap-3">
            {subs.length === 0 && <p className="text-sm text-ink-400">Aucun sous-service pour l’instant.</p>}
            {subs.map((x) => (
              <Link key={x.id} href={`/recherche?service=${slug}&sub=${encodeURIComponent(x.name)}`} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-md shadow-wine-800/10 active:scale-[0.98]">
                <span className="text-base font-medium text-ink-900">{x.name}</span>
                <ChevronRight className="h-5 w-5 text-ink-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
