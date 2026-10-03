"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";

async function toSquareJpeg(file: File, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("blob"))),
      "image/jpeg",
      0.85
    )
  );
}

export function AvatarUploader({
  userId,
  name,
  editable,
}: {
  userId: string;
  name: string;
  editable: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("worker_profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      setAvatarUrl(data?.avatar_url ?? null);
    }
    load();
  }, [userId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image.");
      return;
    }

    setBusy(true);
    try {
      const blob = await toSquareJpeg(file);
      const path = `${userId}/avatar.jpg`;
      const { error: upError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upError) throw upError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (dbError) throw dbError;
      await supabase.from("worker_profiles").update({ avatar_url: url }).eq("id", userId);

      setAvatarUrl(url);
    } catch (err) {
      setError("Échec : " + ((err as { message?: string })?.message ?? "inconnu"));
    }
    setBusy(false);
  }

  async function handleRemove() {
    setError("");
    setBusy(true);
    await supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`]);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    await supabase.from("worker_profiles").update({ avatar_url: null }).eq("id", userId);
    if (dbError) {
      setError("Impossible de supprimer la photo. Réessayez.");
    } else {
      setAvatarUrl(null);
    }
    setBusy(false);
  }

  return (
    <div className="mb-3 flex flex-col items-center">
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wine-600 text-2xl font-medium text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              aria-label={avatarUrl ? "Changer la photo" : "Ajouter une photo"}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-wine-600 text-white disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {editable && busy && <p className="mt-1 text-xs text-ink-600">Envoi…</p>}
      {editable && avatarUrl && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          className="mt-1 text-xs text-ink-600"
        >
          Supprimer la photo
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
