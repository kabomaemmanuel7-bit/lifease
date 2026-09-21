"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

type NewPortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  location: string | null;
  completed_at: string | null;
};

export function InterventionComposer({
  workerId,
  onPublished,
}: {
  workerId: string;
  onPublished: (item: NewPortfolioItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File, kind: "photo" | "video") {
    const ext = file.name.split(".").pop();
    const path = `${workerId}/${Date.now()}-${kind}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("interventions")
      .upload(path, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("interventions").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (photoFile) imageUrl = await uploadFile(photoFile, "photo");
      if (videoFile) videoUrl = await uploadFile(videoFile, "video");

      const { data, error: insertError } = await supabase
        .from("worker_portfolio")
        .insert({
          worker_id: workerId,
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          video_url: videoUrl,
          location: location.trim() || null,
          completed_at: date ? new Date(date).toISOString() : new Date().toISOString(),
        })
        .select("id, title, description, image_url, video_url, location, completed_at")
        .single();

      if (insertError) throw insertError;

      onPublished(data);
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setPhotoFile(null);
      setVideoFile(null);
    } catch {
      setError("Une erreur est survenue, réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-md border border-wine-100 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-ink-900">Publier une intervention</p>
      <Input
        label="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex : Réparation freins Toyota"
        required
      />
      <label className="mb-1.5 block text-sm font-medium text-ink-900">Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
      />
      <Input
        label="Lieu"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Ex : Abomey-Calavi, Zogbo"
      />
      <label className="mb-1.5 block text-sm font-medium text-ink-900">Date et heure</label>
      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
      />
      <label className="mb-1.5 block text-sm font-medium text-ink-900">Photo</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
        className="mb-4 w-full text-sm text-ink-600"
      />
      <label className="mb-1.5 block text-sm font-medium text-ink-900">Vidéo (optionnel)</label>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
        className="mb-4 w-full text-sm text-ink-600"
      />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Publication…" : "Publier"}
      </Button>
    </form>
  );
}
