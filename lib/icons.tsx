import { Home, Car, Laptop, Sparkles, HeartPulse, Wrench } from "lucide-react";

export const categoryIcons: Record<string, typeof Home> = {
  home: Home,
  car: Car,
  laptop: Laptop,
  sparkles: Sparkles,
  "heart-pulse": HeartPulse,
};

export function getCategoryIcon(icon: string) {
  return categoryIcons[icon] ?? Wrench;
}
