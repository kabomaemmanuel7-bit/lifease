"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    setLoading(false);
    if (err) {
      setError("Impossible d'envoyer l'e-mail pour le moment. Réessayez dans quelques minutes.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/connexion" aria-label="Retour"><ChevronLeft className="h-5 w-5 text-ink-900" /></Link>
        <h1 className="text-lg font-medium text-ink-900">Mot de passe oublié</h1>
      </div>
      {sent ? (
        <div className="rounded-xl bg-white p-4 text-sm text-ink-900">
          <p className="font-medium">Vérifiez votre boîte e-mail.</p>
          <p className="mt-2 text-ink-600">Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d'être envoyé. Pensez à regarder dans les courriers indésirables.</p>
          <Link href="/connexion" className="mt-4 block text-center font-medium text-wine-700 underline">Retour à la connexion</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="mb-4 text-sm text-ink-600">Saisissez l'adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          <Input label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
          {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Envoi en cours…" : "Envoyer le lien"}</Button>
        </form>
      )}
    </main>
  );
}
