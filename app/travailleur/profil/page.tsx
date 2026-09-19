"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type Category = { id: string; name: string };
type Status = "disponible" | "occupe" | "indisponible";

export default function TravailleurProfilPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [metier, setMetier] = useState("");
  const [competences, setCompetences] = useState("");
  const [zone, setZone] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("disponible");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "travailleur") {
        router.push("/");
        return;
      }

      const { data: categoryData } = await supabase
        .from("services")
        .select("id, name")
        .order("name");
      setCategories(categoryData ?? []);

      const { data: existing } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (existing) {
        setCategoryId(existing.service_id ?? "");
        setMetier(existing.metier ?? "");
        setCompetences((existing.competences ?? []).join(", "));
        setZone(existing.zone ?? "");
        setExperienceYears(String(existing.experience_years ?? 0));
        setDescription(existing.description ?? "");
        setStatus(existing.status ?? "disponible");
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!metier.trim() || !categoryId) {
      setError("Merci de renseigner au moins la catégorie et le métier.");
      return;
    }

    setSaving(true);

    const { error: upsertError } = await supabase.from("worker_profiles").upsert({
      id: userId,
      service_id: categoryId,
      metier: metier.trim(),
      competences: competences
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      zone: zone.trim() || null,
      experience_years: parseInt(experienceYears, 10) || 0,
      description: description.trim() || null,
      status,
    });

    setSaving(false);

    if (upsertError) {
      setError("Une erreur est survenue. Réessayez.");
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push("/")} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">
          Mon profil professionnel
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          Statut
        </label>
        <div className="mb-4 flex gap-2">
          {(
            [
              { value: "disponible", label: "🟢 Disponible" },
              { value: "occupe", label: "🟠 Occupé" },
              { value: "indisponible", label: "⚫ Indisponible" },
            ] as { value: Status; label: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`flex-1 rounded-md border px-2 py-2 text-xs font-medium ${
                status === option.value
                  ? "border-wine-600 bg-wine-50 text-wine-700"
                  : "border-wine-100 text-ink-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          Service
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
          required
        >
          <option value="">Sélectionner…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <Input
          label="Métier"
          value={metier}
          onChange={(e) => setMetier(e.target.value)}
          placeholder="Ex : Mécanicien automobile"
          required
        />
        <Input
          label="Compétences (séparées par une virgule)"
          value={competences}
          onChange={(e) => setCompetences(e.target.value)}
          placeholder="Ex : Diagnostic auto, Freinage, Batterie"
        />
        <Input
          label="Zone d'intervention"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="Ex : Abomey-Calavi et environs"
        />
        <Input
          label="Années d'expérience"
          type="number"
          min={0}
          value={experienceYears}
          onChange={(e) => setExperienceYears(e.target.value)}
        />

        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          À propos
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Présentez votre activité en quelques mots…"
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
        />

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 text-sm text-green-600">✓ Profil enregistré</p>
        )}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </main>
  );
}
