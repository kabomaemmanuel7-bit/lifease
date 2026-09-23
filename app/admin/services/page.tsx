"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { getServiceIcon, serviceIcons } from "@/lib/icons";

type ServiceItem = {
  id: string;
  slug: string;
  name: string;
  icon: string;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("wrench");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iconKeys = Object.keys(serviceIcons);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setChecking(false);
      loadServices();
    }

    checkAdmin();
  }, [router]);

  async function loadServices() {
    const { data } = await supabase
      .from("services")
      .select("id, slug, name, icon")
      .order("name");
    setServices(data ?? []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Merci d'indiquer un nom.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("services").insert({
      name: name.trim(),
      slug: slugify(name.trim()),
      icon,
    });

    if (insertError) {
      setError("Une erreur est survenue (le nom existe peut-être déjà).");
      setSaving(false);
      return;
    }

    setName("");
    setIcon("wrench");
    setSaving(false);
    loadServices();
  }

  async function handleDelete(id: string) {
    await supabase.from("services").delete().eq("id", id);
    loadServices();
  }

  if (checking || loading) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
          <h1 className="text-lg font-medium text-ink-900">Services</h1>
        </div>

        <p className="mb-3 text-sm font-medium text-ink-600">Ajouter un service</p>
        <form onSubmit={handleAdd} className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Vitrerie"
            className="mb-3 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
          />
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="mb-3 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
          >
            {iconKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Ajout…" : "Ajouter"}
          </Button>
        </form>

        <p className="mb-3 text-sm font-medium text-ink-600">Services actuels</p>
        <div className="flex flex-col gap-3">
          {services.map((s) => {
            const Icon = getServiceIcon(s.icon);
            return (
              <Card key={s.id} className="flex items-center gap-3 bg-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-wine-50">
                  <Icon className="h-5 w-5 text-wine-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-ink-900">{s.name}</span>
                <button
                  onClick={() => handleDelete(s.id)}
                  aria-label="Supprimer"
                  className="text-wine-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
