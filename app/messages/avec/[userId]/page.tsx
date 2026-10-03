"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AvecPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_or_create_conversation", { other: params.userId });
      if (error || !data) { setError("Impossible d’ouvrir la conversation : " + (error?.message ?? "inconnu")); return; }
      router.replace(`/messages/${data}`);
    })();
  }, [params.userId, router]);

  return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">{error || "Ouverture…"}</main>;
}
