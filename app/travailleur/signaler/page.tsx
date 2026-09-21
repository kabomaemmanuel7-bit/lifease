"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerQuickMenu } from "@/components/WorkerQuickMenu";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function SignalerPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/connexion");
      return;
    }

    const { error: insertError } = await supabase.from("problem_reports").insert({
      worker_id: session.user.id,
      message,
    });

    setSending(false);

    if (insertError) {
      setError("Une erreur est survenue, réessaie.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-beige-50 mx-auto flex max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="mb-2 text-2xl">✓</p>
        <p className="mb-1 text-lg font-medium text-ink-900">Signalement envoyé</p>
        <p className="mb-6 text-sm text-ink-600">
          Notre équipe va examiner votre message rapidement.
        </p>
        <Button onClick={() => router.push("/travailleur/mon-profil")} className="w-full">
          Retour à mon profil
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <WorkerQuickMenu />
          <h1 className="text-lg font-medium text-ink-900">Signaler un problème</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-sm font-medium text-ink-900">
            Décrivez le problème rencontré
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Expliquez ce qui ne fonctionne pas ou ce que vous souhaitez signaler…"
            className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-wine-400 focus:outline-none"
            required
          />
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={sending} className="w-full">
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </form>
      </div>
    </main>
  );
}
