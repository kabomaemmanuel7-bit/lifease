"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function MessageButton({ workerId }: { workerId: string }) {
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? null));
  }, []);
  const mine = me === workerId;
  return (
    <Link href={mine ? "/messages" : `/messages/avec/${workerId}`} className="block w-full rounded-md border border-wine-200 py-3 text-center text-sm font-medium text-wine-700">
      {mine ? "Mes messages" : "Écrire un message"}
    </Link>
  );
}
