"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function NouveauMotDePassePage() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); setChecked(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (password !== confirm) { setError("Les deux mots de passe ne sont pas identiques."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError("Impossible de changer le mot de passe. Demandez un nouveau lien."); return; }
    setDone(true);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6">
      <h1 className="mb-6 text-lg font-medium text-ink-900">Nouveau mot de passe</h1>
      {done ? (
        <div className="rounded-xl bg-white p-4 text-sm text-ink-900">
          <p className="font-medium">Mot de passe modifié.</p>
          <Link href="/" className="mt-4 block text-center font-medium text-wine-700 underline">Aller à l'accueil</Link>
        </div>
      ) : !checked ? (
        <p className="text-sm text-ink-600">Vérification…</p>
      ) : !ready ? (
        <div className="rounded-xl bg-white p-4 text-sm text-ink-600">
          <p>Ce lien n'est plus valide ou a déjà été utilisé.</p>
          <Link href="/mot-de-passe-oublie" className="mt-4 block text-center font-medium text-wine-700 underline">Demander un nouveau lien</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Input label="Nouveau mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input label="Confirmer le mot de passe" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Enregistrement…" : "Enregistrer"}</Button>
        </form>
      )}
    </main>
  );
}
