"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Role = "client" | "travailleur";

export default function InscriptionPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(traduireErreur(signUpError.message));
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/connexion?message=inscription-reussie");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <h1 className="mb-1 text-xl font-medium text-ink-900">Créer un compte</h1>
      <p className="mb-6 text-sm text-ink-600">
        Rejoignez LifEase dès maintenant.
      </p>

      <div className="mb-6 flex rounded-md border border-wine-100 p-1">
        <button
          type="button"
          onClick={() => setRole("client")}
          className={cn(
            "flex-1 rounded-sm py-2 text-sm font-medium transition-colors",
            role === "client" ? "bg-wine-600 text-white" : "text-ink-600"
          )}
        >
          Client
        </button>
        <button
          type="button"
          onClick={() => setRole("travailleur")}
          className={cn(
            "flex-1 rounded-sm py-2 text-sm font-medium transition-colors",
            role === "travailleur" ? "bg-wine-600 text-white" : "text-ink-600"
          )}
        >
          Travailleur
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Input
          id="fullName"
          label="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
        <Input
          id="confirmPassword"
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Création en cours…" : "S'inscrire"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-wine-600">
          Se connecter
        </Link>
      </p>
    </main>
  );
}

function traduireErreur(message: string): string {
  if (message.includes("already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (message.includes("Password should be")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  return "Une erreur est survenue. Réessayez.";
}
