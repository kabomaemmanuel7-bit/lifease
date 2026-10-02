"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type Offering = {
  id: string;
  title: string;
  average_price: number | null;
  price_unit: string | null;
};

const unitOptions = ["intervention", "heure", "jour", "unité", "mètre"];

export default function ServicesTarifesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("intervention");

  useEffect(() => {
    async function load() {
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

      if (profile?.role !== "travailleur") {
        router.push("/");
        return;
      }

      setUserId(session.user.id);

      const { data } = await supabase
        .from("worker_offerings")
        .select("id, title, average_price, price_unit")
        .eq("worker_id", session.user.id)
        .order("created_at", { ascending: true });

      setOfferings((data ?? []) as Offering[]);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim()) return;
    setError("");

    const priceValue = price.trim() === "" ? null : Number(price);
    if (priceValue !== null && (Number.isNaN(priceValue) || priceValue < 0)) {
      setError("Le prix doit être un nombre positif.");
      return;
    }

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("worker_offerings")
      .insert({
        worker_id: userId,
        title: title.trim(),
        average_price: priceValue,
        price_unit: priceValue === null ? null : unit,
      })
      .select("id, title, average_price, price_unit")
      .single();
    setSaving(false);

    if (insertError || !data) {
      setError("Impossible d'ajouter ce service. Réessayez.");
      return;
    }

    setOfferings((prev) => [...prev, data as Offering]);
    setTitle("");
    setPrice("");
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase
      .from("worker_offerings")
      .delete()
      .eq("id", id);
    if (!deleteError) {
      setOfferings((prev) => prev.filter((o) => o.id !== id));
    }
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
        <button
          onClick={() => router.push("/travailleur/mon-profil")}
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">Mes services tarifés</h1>
      </div>

      <form onSubmit={handleAdd} className="mb-8">
        <Input
          label="Service"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Installation d'une prise"
          required
        />
        <Input
          label="Prix moyen en FCFA (optionnel)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ex : 2500"
          inputMode="numeric"
        />

        <label className="mb-1.5 block text-sm font-medium text-ink-900">Unité</label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
        >
          {unitOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Ajout…" : "Ajouter ce service"}
        </Button>
      </form>

      <p className="mb-3 text-sm font-medium text-ink-600">Mes services</p>
      <div className="flex flex-col gap-3">
        {offerings.length === 0 && (
          <p className="text-center text-sm text-ink-600">
            Aucun service pour le moment.
          </p>
        )}
        {offerings.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between rounded-md border border-wine-100 bg-white p-3"
          >
            <div>
              <p className="text-sm font-medium text-ink-900">{o.title}</p>
              <p className="text-xs text-ink-600">
                {o.average_price != null
                  ? `${Number(o.average_price).toLocaleString("fr-FR")} FCFA${
                      o.price_unit ? ` / ${o.price_unit}` : ""
                    }`
                  : "Sur devis"}
              </p>
            </div>
            <button onClick={() => handleDelete(o.id)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
