"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type Slide = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  position: number;
  active: boolean;
};

export default function AdminBannieresPage() {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      loadSlides();
    }

    checkAdmin();
  }, [router]);

  async function loadSlides() {
    const { data } = await supabase
      .from("banner_slides")
      .select("id, image_url, title, subtitle, position, active")
      .order("position");
    setSlides(data ?? []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!imageFile) {
      setError("Merci de choisir une image.");
      return;
    }

    setSaving(true);

    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(filePath, imageFile);

    if (uploadError) {
      setError("Impossible d'envoyer l'image. Réessayez.");
      setSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("banners")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("banner_slides").insert({
      image_url: publicUrlData.publicUrl,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      position: slides.length,
      active: true,
    });

    if (insertError) {
      setError("Une erreur est survenue. Réessayez.");
      setSaving(false);
      return;
    }

    setTitle("");
    setSubtitle("");
    setImageFile(null);
    setSaving(false);
    loadSlides();
  }

  async function handleToggleActive(slide: Slide) {
    await supabase
      .from("banner_slides")
      .update({ active: !slide.active })
      .eq("id", slide.id);
    loadSlides();
  }

  async function handleDelete(id: string) {
    await supabase.from("banner_slides").delete().eq("id", id);
    loadSlides();
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
          <h1 className="text-lg font-medium text-ink-900">Bannière d'accueil</h1>
        </div>

        <p className="mb-3 text-sm font-medium text-ink-600">Ajouter une image</p>
        <form onSubmit={handleAdd} className="mb-6">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="mb-3 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre (optionnel)"
            className="mb-3 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
          />
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Sous-titre (optionnel)"
            className="mb-3 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
          />
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Envoi…" : "Ajouter"}
          </Button>
        </form>

        <p className="mb-3 text-sm font-medium text-ink-600">Images actuelles</p>
        <div className="flex flex-col gap-3">
          {slides.length === 0 && (
            <p className="text-center text-sm text-ink-600">
              Aucune image. La bannière par défaut s'affiche.
            </p>
          )}
          {slides.map((slide) => (
            <Card key={slide.id} className="overflow-hidden bg-white p-0">
              <img
                src={slide.image_url}
                alt={slide.title ?? ""}
                className="h-32 w-full object-cover"
              />
              <div className="p-3">
                {slide.title && (
                  <p className="text-sm font-medium text-ink-900">{slide.title}</p>
                )}
                {slide.subtitle && (
                  <p className="text-xs text-ink-600">{slide.subtitle}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(slide)}
                    className={`rounded-pill px-3 py-1 text-xs font-medium ${
                      slide.active
                        ? "bg-green-100 text-green-700"
                        : "bg-ink-900/5 text-ink-600"
                    }`}
                  >
                    {slide.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => handleDelete(slide.id)}
                    aria-label="Supprimer"
                    className="text-wine-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
