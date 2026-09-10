import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const categories = [
  { label: "Maison" },
  { label: "Auto" },
  { label: "Tech" },
  { label: "Services" },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wine-600 text-sm font-medium text-white">
          A
        </div>
      </div>

      <p className="mb-1 text-sm text-ink-600">Bonjour, Alex</p>
      <p className="mb-5 text-base font-medium text-ink-900">
        Cotonou, Bénin
      </p>

      <Card className="mb-5 flex items-center gap-2 text-ink-400">
        <span className="text-sm">Rechercher un service…</span>
      </Card>

      <div className="mb-6 rounded-md bg-wine-600 p-4">
        <p className="mb-1 text-sm font-medium text-white">Besoin urgent</p>
        <p className="text-xs text-wine-100">
          Trouvez un professionnel disponible rapidement
        </p>
      </div>

      <p className="mb-3 text-sm font-medium text-ink-600">Catégories</p>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {categories.map((c) => (
          <Card key={c.label} className="text-sm text-ink-900">
            {c.label}
          </Card>
        ))}
      </div>

      <p className="mb-3 text-sm font-medium text-ink-600">Près de vous</p>
      <Card className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-wine-100" />
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-900">Jean K.</p>
          <p className="text-xs text-ink-600">Mécanicien · 1,3 km</p>
        </div>
        <Badge tone="success">Disponible</Badge>
      </Card>
    </main>
  );
}
