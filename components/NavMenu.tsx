"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Home,
  MessageCircle,
  ClipboardList,
  Heart,
  Users,
  Info,
  UserCircle,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCategoryIcon } from "@/lib/icons";

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
  const [showCategories, setShowCategories] = useState(false);
  const [showInfos, setShowInfos] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && categories.length === 0) {
      supabase
        .from("categories")
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
    setShowCategories(false);
    setShowInfos(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-wine-600 hover:bg-beige-100"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-72 rounded-lg border border-beige-200 bg-white py-2 shadow-lg">
          <MenuLink href="/" icon={Home} onClick={closeMenu}>
            Accueil
          </MenuLink>
          <MenuLink href="/messages" icon={MessageCircle} onClick={closeMenu}>
            Messages
          </MenuLink>

          <button
            onClick={() => setShowCategories((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-beige-50"
          >
            <span className="flex items-center gap-3">
              <ClipboardList className="h-4 w-4 text-wine-600" />
              Catégories
            </span>
            <ChevronDown
              className={`h-4 w-4 text-ink-400 transition-transform ${
                showCategories ? "rotate-180" : ""
              }`}
            />
          </button>
          {showCategories && (
            <div className="bg-beige-50 py-1">
              {categories.length === 0 ? (
                <p className="px-9 py-2 text-xs text-ink-400">Chargement…</p>
              ) : (
                categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  return (
                    <Link
                      key={cat.id}
                      href={`/recherche?category=${cat.slug}`}
                      onClick={closeMenu}
                      className="flex items-center gap-3 px-9 py-2 text-sm text-ink-600 hover:text-wine-600"
                    >
                      <Icon className="h-3.5 w-3.5 text-wine-600" />
                      {cat.name}
                    </Link>
                  );
                })
              )}
              <Link
                href="/categories"
                onClick={closeMenu}
                className="block px-9 py-2 text-sm font-medium text-wine-600"
              >
                Voir toutes les catégories
              </Link>
            </div>
          )}

          <MenuLink href="/commandes" icon={ClipboardList} onClick={closeMenu}>
            Commandes
          </MenuLink>
          <MenuLink href="/favoris" icon={Heart} onClick={closeMenu}>
            Favoris
          </MenuLink>
          <MenuLink href="/travailleurs-suivis" icon={Users} onClick={closeMenu}>
            Travailleurs suivis
          </MenuLink>

          <button
            onClick={() => setShowInfos((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-beige-50"
          >
            <span className="flex items-center gap-3">
              <Info className="h-4 w-4 text-wine-600" />
              Informations
            </span>
            <ChevronDown
              className={`h-4 w-4 text-ink-400 transition-transform ${
                showInfos ? "rotate-180" : ""
              }`}
            />
          </button>
          {showInfos && (
            <div className="bg-beige-50 py-1">
              {INFO_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="block px-9 py-2 text-sm text-ink-600 hover:text-wine-600"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="my-1 border-t border-beige-200" />

          <MenuLink href="/compte" icon={UserCircle} onClick={closeMenu}>
            Mon compte
          </MenuLink>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-wine-700 hover:bg-wine-50"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-beige-50"
    >
      <Icon className="h-4 w-4 text-wine-600" />
      {children}
    </Link>
  );
}
