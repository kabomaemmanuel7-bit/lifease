"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { WorkerProfileView } from "@/components/WorkerProfileView";
import { supabase } from "@/lib/supabase";

export default function MonProfilPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
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
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading || !userId) {
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
          <h1 className="text-lg font-medium text-ink-900">Mon profil</h1>
        </div>
        <WorkerProfileView workerId={userId} variant="own" />
      </div>
    </main>
  );
}
