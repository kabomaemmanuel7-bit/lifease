/**
 * Combine des classes CSS conditionnelles en une seule chaîne.
 * Usage: cn("base", condition && "extra", autreCondition ? "a" : "b")
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
