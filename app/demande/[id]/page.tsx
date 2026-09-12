"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Urgency = "normal" | "eleve" | "tres_eleve";

const urgencyOptions: { value: Urgency; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "eleve", label: "Élevé" },
  { value: "tres_eleve", label: "Très élevé" },
];

export default function DemandePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [workerName, setWorkerName] = useState<string>("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadWorker() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", params.id)
        .single();
      setWorkerName(data?.full_name ?? "ce professionnel");
    }
    loadWorker();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 5) {
      setError("Merci de décrire un peu plus votre besoin.");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/connexion");
      return;
    }

    const { data: workerProfile } = await supabase
      .from("worker_profiles")
      .select("category_id")
      .eq("id", params.id)
      .single();

    const { error: insertError } = await supabase.from("requests").insert({
      client_id: session.user.id,
      worker_id: params.id,
      category_id: workerProfile?.category_id ?? null,
      description,
      urgency,
    });

    if (insertError) {
      setError("Une erreur est survenue. Réessayez.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="mb-2 text-2xl">✓</p>
        <p className="mb-1 text-lg font-medium text-ink-900">
          Demande envoyée
        </p>
        <p className="mb-6 text-sm text-ink-600">
          {workerName} a été notifié de votre demande.
        </p>
        <Button onClick={() => router.push("/")} className="w-full">
          Retour à l'accueil
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">Nouvelle demande</h1>
      </div>

      <p className="mb-4 text-sm text-ink-600">
        Où avez-vous besoin d'aide, {workerName} ?
      </p>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium text-ink-900"
        >
          Décrivez votre demande
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : Ma voiture ne démarre plus…"
          rows={4}
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
          required
        />

        <p className="mb-2 text-sm font-medium text-ink-900">
          Niveau d'urgence
        </p>
        <div className="mb-6 flex gap-2">
          {urgencyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setUrgency(option.value)}
              className={cn(
                "flex-1 rounded-md border py-2 text-sm font-medium transition-colors",
                urgency === option.value
                  ? "border-wine-600 bg-wine-600 text-white"
                  : "border-wine-100 text-ink-600"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Envoi en cours…" : "Envoyer la demande"}
        </Button>
      </form>
    </main>
  );
}
