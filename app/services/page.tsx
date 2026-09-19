"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { getServiceIcon } from "@/lib/icons";

type ServiceItem = {
  id: string;
  slug: string;
  name: string;
  icon: string;
};

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase
        .from("services")
        .select("id, slug, name, icon")
        .order("name");
      setServices(data ?? []);
      setLoading(false);
    }
    loadServices();
  }, []);

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
          <h1 className="text-lg font-medium text-ink-900">Services</h1>
        </div>

        {loading && <p className="text-sm text-ink-600">Chargement…</p>}

        <div className="flex flex-col gap-3">
          {services.map((s) => {
            const Icon = getServiceIcon(s.icon);
            return (
              <Link key={s.id} href={`/recherche?service=${s.slug}`}>
                <Card className="flex items-center gap-3 bg-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                    <Icon className="h-5 w-5 text-wine-600" />
                  </div>
                  <span className="text-sm font-medium text-ink-900">
                    {s.name}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
