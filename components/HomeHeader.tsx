'use client';

import Link from 'next/link';
import { Bell, ChevronDown, MapPin, Search, ArrowRight } from 'lucide-react';
import { NavMenu } from '@/components/NavMenu';

type Props = {
  initiale: string;
  accountHref: string;
  city: string | null;
  query: string;
  onQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  searchMsg: string | null;
  children?: React.ReactNode;
};

function LogoIcon() {
  return (
    <svg width="46" height="42" viewBox="0 0 56 52" aria-hidden="true">
      <path d="M4 27 L28 7 L36 13.6" fill="none" stroke="#0F8541" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 13.6 L52 27" fill="none" stroke="#F7A82A" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 26 V45 a2 2 0 0 0 2 2 H44 a2 2 0 0 0 2 -2 V26" fill="none" stroke="#0F8541" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(15 20) scale(1.1)">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="#06552C" strokeWidth="2.4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default function HomeHeader(p: Props) {
  return (
    <section className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-wine-600 to-wine-800 pb-6 text-white">
      <div className="absolute left-0 top-0 h-[96px] w-[66%] rounded-br-[3.5rem] bg-white" />
      <img
        src="/hero.png"
        alt=""
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
        className="absolute right-0 top-[60px] h-[210px] w-[50%] object-cover object-top"
        style={{
          borderTopLeftRadius: 100,
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 28%)',
          maskImage: 'linear-gradient(to right, transparent 0, #000 28%)',
        }}
      />
      <div className="relative px-5 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <LogoIcon />
            <div>
              <p className="text-[27px] font-extrabold leading-none tracking-tight text-wine-700">
                Lif<span className="text-[#F7A82A]">Ease</span>
              </p>
              <p className="mt-1 text-[9px] font-medium text-wine-700">Trouvez. Contactez. Réparez.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-white"><NavMenu /></div>
            <Link href="/mes-demandes" aria-label="Notifications" className="relative">
              <Bell className="h-6 w-6 fill-white text-white" />
            </Link>
            <Link href={p.accountHref} aria-label="Mon compte" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white text-sm font-semibold text-wine-700">
              {p.initiale}
            </Link>
          </div>
        </div>
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-900">
          <MapPin className="h-4 w-4 fill-wine-600 text-wine-600" />
          {p.city ? `${p.city}, Bénin` : 'Bénin'}
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
        <h1 className="mt-3 max-w-[54%] text-[26px] font-bold leading-[1.1]">
          Quel service vous faut-il <span className="text-[#F7A82A]">aujourd'hui ?</span>
        </h1>
        <p className="mt-2 max-w-[54%] text-xs font-medium">Des professionnels qualifiés <span className="text-wine-100">près de chez vous</span></p>
        <form onSubmit={p.onSubmit} className="mt-5 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-lg">
          <Search className="h-5 w-5 shrink-0 text-wine-600" />
          <input
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder="Ex. Plombier, électricien…"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none"
          />
          <button
            type="submit"
            aria-label="Rechercher"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-wine-600 to-wine-800 text-white"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
        {p.searchMsg && <p className="mt-2 text-xs text-wine-100">{p.searchMsg}</p>}
        {p.children}
      </div>
    </section>
  );
}
