"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const LINK_ITEMS = [
  { label: "Mon profil", href: "/travailleur/mon-profil" },
  { label: "Modifier mon profil", href: "/travailleur/profil" },
  { label: "Mes commandes", href: "/travailleur/demandes" },
  { label: "Mon portefeuille", href: "/travailleur/portefeuille" },
  { label: "Tableau de bord", href: "/travailleur/tableau-de-bord" },
  { label: "Signaler un problème", href: "/travailleur/signaler" },
];

export function WorkerQuickMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-900"
        aria-label="Menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-beige-200 bg-white py-2 shadow-lg">
          {LINK_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink-900 hover:bg-beige-50"
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="block w-full px-4 py-2.5 text-left text-sm text-wine-700 hover:bg-beige-50"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
