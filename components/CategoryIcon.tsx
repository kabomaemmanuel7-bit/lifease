import {
  Zap, Droplets, Car, Smartphone, Paintbrush, Hammer, Wrench, Scissors,
  Shirt, Sparkles, Laptop, Camera, Truck, Utensils, Home, HardHat, Radio,
  type LucideIcon,
} from "lucide-react";

const RULES: [string[], LucideIcon][] = [
  [["electr"], Zap],
  [["plomb"], Droplets],
  [["meca", "auto", "garage", "voiture"], Car],
  [["telephon", "mobile"], Smartphone],
  [["peint"], Paintbrush],
  [["antenn", "satellite", "parabol"], Radio],
  [["menuis", "charpent", "bois"], Hammer],
  [["maco", "btp", "construc", "carrel"], HardHat],
  [["inform", "ordinat"], Laptop],
  [["photo", "video"], Camera],
  [["coiff", "beaut"], Scissors],
  [["couture", "tailleur", "mode"], Shirt],
  [["nettoy", "menage"], Sparkles],
  [["demenag", "transport", "livraison"], Truck],
  [["cuisin", "traiteur", "restau", "patiss"], Utensils],
  [["maison", "domicile", "clim"], Home],
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function CategoryIcon({ name, slug, className }: { name: string; slug?: string; className?: string }) {
  const key = norm(`${name} ${slug ?? ""}`);
  const hit = RULES.find(([words]) => words.some((w) => key.includes(w)));
  const Icon = hit ? hit[1] : Wrench;
  return <Icon className={className} />;
}
