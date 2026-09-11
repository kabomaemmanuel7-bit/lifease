"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <h1 className="mb-1 text-xl font-medium text-ink-900">Bon retour !</h1>
      <p className="mb-6 text-sm text-ink-600">
        Connectez-vous pour continuer.
      </p>

      <form onSubmit={handleSubmit}>
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Vous n'avez pas de compte ?{" "}
        <Link href="/inscription" className="font-medium text-wine-600">
          S'inscrire
        </Link>
      </p>
    </main>
  );
}
