"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  title: string;
  location: string | null;
  intervention_date: string | null;
  created_at: string;
};

const MAX_FILES = 6;
const MAX_SIZE = 40 * 1024 * 1024;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function InterventionsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(todayISO());
  const [files, setFiles] = useState<File[]>([]);

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
        .from("worker_portfolio")
        .select("id, title, location, intervention_date, created_at")
        .eq("worker_id", session.user.id)
        .order("created_at", { ascending: false });

      setItems((data ?? []) as Item[]);
      setLoading(false);
    }
    load();
  }, [router]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const tooBig = picked.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(`"${tooBig.name}" dépasse 40 Mo.`);
      return;
    }
    const merged = [...files, ...picked];
    if (merged.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} fichiers par intervention.`);
      return;
    }
    setFiles(merged);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError("");

    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    if (files.length === 0) {
      setError("Ajoutez au moins une photo ou une vidéo.");
      return;
    }

    setSaving(true);
    const uploaded: { url: string; isVideo: boolean }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${userId}/${Date.now()}-${i}-${safeName(file.name)}`;
      const { error: upError } = await supabase.storage
        .from("interventions")
        .upload(path, file, { contentType: file.type });
      if (upError) {
        setError(`Échec de l'envoi de "${file.name}". Réessayez.`);
        setSaving(false);
        return;
      }
      const { data: pub } = supabase.storage.from("interventions").getPublicUrl(path);
      uploaded.push({ url: pub.publicUrl, isVideo: file.type.startsWith("video/") });
    }

    const images = uploaded.filter((u) => !u.isVideo).map((u) => u.url);
    const video = uploaded.find((u) => u.isVideo)?.url ?? null;

    const { data, error: insError } = await supabase
      .from("worker_portfolio")
      .insert({
        worker_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        completed_at: date,
        intervention_date: new Date(`${date}T12:00:00`).toISOString(),
        image_url: images[0] ?? null,
        image_urls: images,
        video_url: video,
        media_urls: uploaded.map((u) => u.url),
      })
      .select("id, title, location, intervention_date, created_at")
      .single();
    setSaving(false);

    if (insError || !data) {
      setError("Les fichiers sont envoyés mais l'intervention n'a pas pu être enregistrée.");
      return;
    }

    setItems((prev) => [data as Item, ...prev]);
    setTitle("");
    setDescription("");
    setLocation("");
    setDate(todayISO());
    setFiles([]);
  }

  async function handleDelete(id: string) {
    const { error: delError } = await supabase
      .from("worker_portfolio")
      .delete()
      .eq("id", id);
    if (!delError) {
      setItems((prev) => prev.filter((i) => i.id !== id));
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
        <h1 className="text-lg font-medium text-ink-900">Mes interventions</h1>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <Input
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Placement d'antenne"
          required
        />
        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          Description (optionnel)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
        />
        <Input
          label="Lieu (optionnel)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex : Cotonou"
        />
        <Input
          label="Date de l'intervention"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          Photos et vidéo
        </label>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFiles}
          className="mb-2 block w-full text-sm text-ink-600"
        />
        <p className="mb-3 text-xs text-ink-400">
          Jusqu'à {MAX_FILES} fichiers, 40 Mo maximum chacun.
        </p>

        {files.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-md border border-wine-100 bg-white px-3 py-2"
              >
                <p className="truncate pr-2 text-xs text-ink-900">{f.name}</p>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label="Retirer"
                >
                  <X className="h-4 w-4 text-ink-600" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Envoi en cours…" : "Publier l'intervention"}
        </Button>
      </form>

      <p className="mb-3 text-sm font-medium text-ink-600">Mes interventions publiées</p>
      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-center text-sm text-ink-600">
            Aucune intervention pour le moment.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between rounded-md border border-wine-100 bg-white p-3"
          >
            <div>
              <p className="text-sm font-medium text-ink-900">{item.title}</p>
              <p className="text-xs text-ink-400">
                {new Date(item.intervention_date ?? item.created_at).toLocaleDateString(
                  "fr-FR"
                )}
                {item.location ? ` – ${item.location}` : ""}
              </p>
            </div>
            <button onClick={() => handleDelete(item.id)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
