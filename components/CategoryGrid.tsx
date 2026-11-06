import Link from 'next/link';
import { ArrowRight, LayoutGrid } from 'lucide-react';

type Service = { id: string; slug: string; name: string };

export const TILES = [
  { file: 'electricite', label: 'Électricité', stem: 'elect' },
  { file: 'plomberie', label: 'Plomberie', stem: 'plomb' },
  { file: 'mecanique', label: 'Mécanique', stem: 'mecan' },
  { file: 'telephone', label: 'Téléphone', stem: 'telep' },
  { file: 'peinture', label: 'Peinture', stem: 'peint' },
  { file: 'antennes', label: 'Antennes', stem: 'anten' },
  { file: 'menuiserie', label: 'Menuiserie', stem: 'menui' },
  { file: 'nettoyage', label: 'Nettoyage', stem: 'netto' },
];

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CategoryGrid({ services }: { services: Service[] }) {
  const hrefFor = (stem: string) => {
    const s = services.find((x) => norm(x.name).includes(stem));
    return s ? `/recherche?service=${s.slug}` : '/recherche';
  };
  return (
    <section className="px-5 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <LayoutGrid className="h-5 w-5 text-wine-600" />
          Nos catégories
        </h2>
        <Link href="/categories" className="flex items-center gap-1 text-sm font-semibold text-wine-700">
          Voir tout <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TILES.map((t) => (
          <Link key={t.file} href={hrefFor(t.stem)} className="block overflow-hidden rounded-[22px] shadow-md shadow-wine-800/10 transition-transform active:scale-95">
            <img src={`/categories/${t.file}.webp`} alt={t.label} className="block w-full" />
          </Link>
        ))}
      </div>
    </section>
  );
}
