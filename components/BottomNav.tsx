"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, MessageCircle, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SHOWN = ["/", "/recherche", "/services", "/mes-demandes", "/messages", "/compte"];
const TABS = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/mes-demandes", label: "Demandes", Icon: ClipboardList },
  { href: "/messages", label: "Messages", Icon: MessageCircle },
  { href: "/compte", label: "Compte", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsClient(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsClient(data?.role !== "travailleur" && data?.role !== "admin");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isClient || !SHOWN.includes(pathname)) return null;

  return (
    <>
      <div className="h-16" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-white">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-medium text-wine-600" : "text-ink-400"}`}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
