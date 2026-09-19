"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Urgency = "normal" | "eleve" | "tres_eleve";

type ServiceItem = {
  id: string;
  name: string;
};

const urgencyOptions: { value: Urgency; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "eleve", label: "Élevé" },
  { value: "tres_eleve", label: "Très élevé" },
];

export default function DemandePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [workerName, setWorkerName] = useState<string>("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [contactName, setContactName] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [{ data: profileData }, { data: workerProfile }, { data: serviceData }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", params.id).single(),
          supabase.from("worker_profiles").select("service_id").eq("id", params.id).single(),
          supabase.from("services").select("id, name").order("name"),
        ]);

      setWorkerName(profileData?.full_name ?? "ce professionnel");
      setServices(serviceData ?? []);
      if (workerProfile?.service_id) {
        setServiceId(workerProfile.service_id);
      }
    }
    loadData();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!serviceId) {
      setError("Merci de choisir un service.");
      return;
    }
    if (!contactName.trim()) {
      setError("Merci d'indiquer votre nom et prénom.");
      return;
    }
    if (!address.trim()) {
      setError("Merci d'indiquer votre adresse.");
      return;
    }
    if (!googleMapsLink.trim()) {
      setError("Le lien Google Maps est obligatoire.");
      return;
    }
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

    let videoUrl: string | null = null;

    if (videoFile) {
      const fileExt = videoFile.name.split(".").pop();
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("requests-media")
        .upload(filePath, videoFile);

      if (uploadError) {
        setError("Impossible d'envoyer la vidéo. Réessayez.");
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("requests-media")
        .getPublicUrl(filePath);
      videoUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("requests").insert({
      client_id: session.user.id,
      worker_id: params.id,
      service_id: serviceId,
      contact_name: contactName.trim(),
      address: address.trim(),
      google_maps_link: googleMapsLink.trim(),
      video_url: videoUrl,
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
      <main className="min-h-screen bg-beige-50 mx-auto flex max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="mb-2 text-2xl">✓</p>
        <p className="mb-1 text-lg font-medium text-ink-900">
          Demande envoyée
        </p>
        <p className="mb-2 text-sm text-ink-600">
          {workerName} a été notifié de votre demande.
        </p>
        <p className="mb-6 rounded-md bg-wine-50 p-3 text-xs text-wine-700">
          Pour votre sécurité, aucun frais n'est à payer avant l'intervention.
          Toutes les transactions se font uniquement sur la plateforme ; toute
          tentative de contournement est passible de sanction.
        </p>
        <Button onClick={() => router.push("/")} className="w-full">
          Retour à l'accueil
        </Button>
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
          <h1 className="text-lg font-medium text-ink-900">Nouvelle demande</h1>
        </div>

        <p className="mb-4 text-sm text-ink-600">
          Où avez-vous besoin d'aide, {workerName} ?
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-sm font-medium text-ink-900">
            Service souhaité
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
            required
          >
            <option value="">Sélectionner…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-sm font-medium text-ink-900">
            Nom et prénom
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Ex : Jean Kaboma"
            className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
            required
          />

          <label className="mb-1.5 block text-sm font-medium text-ink-900">
            Adresse
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex : Rue 123, Cotonou"
            className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
            required
          />

          <label className="mb-1.5 block text-sm font-medium text-ink-900">
            Lien Google Maps <span className="text-wine-600">*</span>
          </label>
          <input
            type="url"
            value={googleMapsLink}
            onChange={(e) => setGoogleMapsLink(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
            required
          />

          <label className="mb-1.5 block text-sm font-medium text-ink-900">
            Vidéo de la panne (optionnel)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900"
          />

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
      </div>
    </main>
  );
}
