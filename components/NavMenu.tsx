"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getServiceIcon } from "@/lib/icons";

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
};

const INFO_LINKS = [
  { label: "À propos", href: "/informations/a-propos" },
  { label: "FAQ", href: "/informations/faq" },
  { label: "Nous contacter", href: "/informations/contact" },
  { label: "Mentions légales", href: "/informations/mentions-legales" },
  { label: "Politique de confidentialité", href: "/informations/confidentialite" },
  { label: "Conditions générales d'utilisation", href: "/informations/cgu" },
];

export function NavMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [showInfos, setShowInfos] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open && categories.length === 0) {
      supabase
        .from("services")
        .select("id, slug, name, icon")
        .order("name")
        .then(({ data }) => setCategories(data ?? []));
    }
  }, [open, categories.length]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/connexion");
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-wine-600 hover:bg-beige-100"
        aria-label="Ouvrir le menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            className="absolute left-0 top-0 h-full w-[82%] max-w-sm overflow-y-auto bg-white shadow-xl"
          >
            <div className="border-b border-beige-200 px-5 py-5">
              <span className="text-2xl font-semibold tracking-tight text-wine-600">
                LifEase
              </span>
            </div>

            <nav className="flex flex-col py-2">
              <SimpleLink href="/" onClick={closeMenu}>
                Accueil
              </SimpleLink>
              <SimpleLink href="/messages" onClick={closeMenu}>
                Messages
              </SimpleLink>

              <button
                onClick={() => setShowCategories((v) => !v)}
                className={`flex items-center justify-between px-5 py-4 text-left text-base ${
                  showCategories ? "bg-beige-50 font-medium text-ink-900" : "text-ink-900"
                }`}
              >
                Services
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform ${
                    showCategories ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showCategories && (
                <div className="flex flex-col bg-beige-50 pb-2">
                  {categories.length === 0 ? (
                    <p className="px-9 py-2 text-sm text-ink-400">Chargement…</p>
                  ) : (
                    categories.map((cat) => {
                      const Icon = getServiceIcon(cat.icon);
                      return (
                        <Link
                          key={cat.id}
                          href={`/recherche?service=${cat.slug}`}
                          onClick={closeMenu}
                          className="flex items-center gap-2 px-9 py-2.5 text-sm text-ink-600 hover:text-wine-600"
                        >
                          <Icon className="h-4 w-4 text-wine-600" />
                          {cat.name}
                        </Link>
                      );
                    })
                  )}
                  <Link
                    href="/services"
                    onClick={closeMenu}
                    className="px-9 py-2.5 text-sm font-medium text-wine-600"
                  >
                    Voir tous les services
                  </Link>
                </div>
              )}

              <SimpleLink href="/commandes" onClick={closeMenu}>
                Commandes
              </SimpleLink>
              <SimpleLink href="/favoris" onClick={closeMenu}>
                Favoris
              </SimpleLink>
              <SimpleLink href="/travailleurs-suivis" onClick={closeMenu}>
                Travailleurs suivis
              </SimpleLink>

              <button
                onClick={() => setShowInfos((v) => !v)}
                className={`flex items-center justify-between px-5 py-4 text-left text-base ${
                  showInfos ? "bg-beige-50 font-medium text-ink-900" : "text-ink-900"
                }`}
              >
                Informations
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform ${
                    showInfos ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showInfos && (
                <div className="flex flex-col bg-beige-50 pb-2">
                  {INFO_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="px-9 py-2.5 text-sm text-ink-600 hover:text-wine-600"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}

              <div className="my-2 border-t border-beige-200" />

              <SimpleLink href="/compte" onClick={closeMenu}>
                Mon compte
              </SimpleLink>

              <button
                onClick={handleSignOut}
                className="px-5 py-4 text-left text-base font-medium text-wine-700"
              >
                Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function SimpleLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-5 py-4 text-base text-ink-900 hover:bg-beige-50"
    >
      {children}
    </Link>
  );
}
