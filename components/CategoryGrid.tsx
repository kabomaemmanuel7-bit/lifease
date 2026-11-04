import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Service = { id: string; slug: string; name: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
    {children}
  </svg>
);

const Defs = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true">
    <defs>
      <linearGradient id="gBolt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE066" />
        <stop offset="1" stopColor="#FAB005" />
      </linearGradient>
      <linearGradient id="gDrop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6EC1FF" />
        <stop offset="1" stopColor="#1C7ED6" />
      </linearGradient>
      <linearGradient id="gCar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF6B6B" />
        <stop offset="1" stopColor="#E03131" />
      </linearGradient>
      <linearGradient id="gRoll" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE066" />
        <stop offset="1" stopColor="#F59F00" />
      </linearGradient>
      <linearGradient id="gHam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#DEE2E6" />
        <stop offset="1" stopColor="#868E96" />
      </linearGradient>
    </defs>
  </svg>
);

const TILES: { label: string; stem: string; icon: ReactNode }[] = [
  {
    label: "Électricité",
    stem: "electr",
    icon: (
      <Svg>
        <path d="M37 4 14 35h15l-5 25 26-34H36z" fill="url(#gBolt)" stroke="#E8A200" strokeWidth="2" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    label: "Plomberie",
    stem: "plomb",
    icon: (
      <Svg>
        <path d="M32 4C22 18 12 30 12 42a20 20 0 0 0 40 0C52 30 42 18 32 4z" fill="url(#gDrop)" />
        <path d="M21 42a11 11 0 0 0 8 10" stroke="#fff" strokeOpacity=".7" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    label: "Mécanique",
    stem: "meca",
    icon: (
      <Svg>
        <rect x="6" y="28" width="52" height="20" rx="8" fill="url(#gCar)" />
        <path d="M16 30l5-13a5 5 0 0 1 5-3h12a5 5 0 0 1 5 3l5 13z" fill="url(#gCar)" />
        <path d="M20 29l4-10a2 2 0 0 1 2-1.5h12a2 2 0 0 1 2 1.5l4 10z" fill="#BFE3FF" />
        <circle cx="16" cy="38" r="3.5" fill="#FFF3BF" /><circle cx="48" cy="38" r="3.5" fill="#FFF3BF" />
        <rect x="26" y="37" width="12" height="4" rx="2" fill="#7A1212" />
        <rect x="10" y="46" width="10" height="9" rx="3" fill="#2B2B2B" /><rect x="44" y="46" width="10" height="9" rx="3" fill="#2B2B2B" />
      </Svg>
    ),
  },
  {
    label: "Téléphone",
    stem: "telephon",
    icon: (
      <Svg>
        <rect x="18" y="4" width="28" height="56" rx="7" fill="#1C4E9A" />
        <rect x="22" y="11" width="20" height="40" rx="2.5" fill="#74B3FF" />
        <rect x="28" y="6.5" width="8" height="2" rx="1" fill="#74B3FF" />
      </Svg>
    ),
  },
  {
    label: "Peinture",
    stem: "peint",
    icon: (
      <Svg>
        <rect x="6" y="6" width="42" height="16" rx="6" fill="url(#gRoll)" />
        <path d="M48 14h6v14H34v8" stroke="#8A6D1D" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="29.5" y="36" width="9" height="22" rx="3.5" fill="#F59F00" />
      </Svg>
    ),
  },
  {
    label: "Antennes",
    stem: "antenn",
    icon: (
      <Svg>
        <path d="M32 24 20 58M32 24 44 58M25 44h14M22 52h20M28 35h8" stroke="#1E5BC6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <circle cx="32" cy="20" r="3.5" fill="#1E5BC6" />
        <path d="M24 13a11 11 0 0 0 0 14M40 13a11 11 0 0 1 0 14" stroke="#1E5BC6" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M18 8a18 18 0 0 0 0 24M46 8a18 18 0 0 1 0 24" stroke="#1E5BC6" strokeWidth="3" strokeLinecap="round" fill="none" />
      </Svg>
    ),
  },
  {
    label: "Menuiserie",
    stem: "menuis",
    icon: (
      <Svg>
        <g transform="rotate(40 32 32)">
          <rect x="28" y="22" width="8" height="38" rx="3" fill="#E8890C" />
          <rect x="12" y="8" width="40" height="16" rx="4" fill="url(#gHam)" />
        </g>
      </Svg>
    ),
  },
];

export default function CategoryGrid({ services }: { services: Service[] }) {
  const hrefFor = (stem: string) => {
    const s = services.find((x) => norm(x.name).includes(stem));
    return s ? `/recherche?service=${s.slug}` : "/services";
  };
  const card = "flex flex-col items-center gap-2 rounded-2xl bg-white px-1 py-4 text-center shadow-sm";
  return (
    <section className="px-5 pt-6">
      <Defs />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#141414" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="2.5" />
            <rect x="13" y="3" width="8" height="8" rx="2.5" />
            <rect x="3" y="13" width="8" height="8" rx="2.5" />
            <rect x="13" y="13" width="8" height="8" rx="2.5" />
          </svg>
          <h2 className="text-xl font-semibold text-ink-900">Nos catégories</h2>
        </div>
        <Link href="/services" className="flex items-center gap-1 text-sm font-semibold text-ink-900">
          Tout voir <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {TILES.map((t) => (
          <Link key={t.label} href={hrefFor(t.stem)} className={card}>
            {t.icon}
            <span className="text-xs font-semibold text-ink-900">{t.label}</span>
          </Link>
        ))}
        <Link href="/services" className={card}>
          <Svg>
            <circle cx="12" cy="32" r="6" fill="#1E5BC6" />
            <circle cx="32" cy="32" r="6" fill="#1E5BC6" />
            <circle cx="52" cy="32" r="6" fill="#1E5BC6" />
          </Svg>
          <span className="text-xs font-semibold text-ink-900">Autres</span>
        </Link>
      </div>
    </section>
  );
}
