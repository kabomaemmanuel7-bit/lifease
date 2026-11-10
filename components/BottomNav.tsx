"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, User } from "lucide-react";
import { MessagesIcon } from "@/components/MessagesIcon";
import { supabase } from "@/lib/supabase";
import { countUnread } from "@/lib/unread";

const SHOWN = ["/", "/recherche", "/services", "/categories", "/travailleur/demandes", "/messages", "/compte"];
const TABS = [
  { href: "/", label: "Accueil", Icon: Home, fill: true },
  { href: "/recherche", label: "Recherche", Icon: Search, fill: false },
  { href: "/travailleur/demandes", label: "Demandes", Icon: ClipboardList, fill: false },
  { href: "/messages", label: "Messages", Icon: MessagesIcon, fill: true },
  { href: "/compte", label: "Compte", Icon: User, fill: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setShow(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const worker = data?.role === "travailleur";
      setShow(worker);
      if (worker) setUnread(await countUnread(user.id));
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => sub.subscription.unsubscribe();
  }, [pathname]);

  if (!show || !SHOWN.includes(pathname)) return null;

  return (
    <>
      <div className="h-[76px]" />
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-white shadow-[0_-4px_16px_rgba(30,60,40,0.08)]">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ href, label, Icon, fill }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`relative flex flex-1 flex-col items-center gap-1 pb-3 pt-2 text-[12px] ${active ? "font-semibold text-[#16A34A]" : "font-medium text-[#5B6488]"}`}>
                <span className="relative">
                  <Icon className="h-7 w-7" fill={fill ? "currentColor" : "none"} strokeWidth={fill ? 1.5 : 2.2} />
                  {href === "/messages" && unread > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
                  )}
                </span>
                {label}
                {active && <span className="absolute bottom-0 h-[3px] w-4/5 rounded-full bg-[#16A34A]" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
