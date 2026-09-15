/**
 * Tri pondéré des professionnels — moyenne bayésienne.
 *
 * Problème résolu : un compte avec 1 avis de 5★ ne doit pas dépasser
 * un professionnel avec 200 avis à 4,8★. On tire chaque note vers une
 * moyenne de référence tant que le nombre d'avis est faible ; l'effet
 * s'estompe à mesure que rating_count augmente.
 *
 * Formule : score = (v / (v + m)) * R + (m / (v + m)) * C
 *   v = nombre d'avis du professionnel (rating_count)
 *   R = note moyenne du professionnel (rating)
 *   m = seuil de confiance (nombre d'avis à partir duquel on fait confiance à R)
 *   C = note moyenne de référence sur l'ensemble de la plateforme
 */

export interface Rankable {
  rating: number | null;
  rating_count: number | null;
}

const CONFIDENCE_THRESHOLD = 10; // m
const PLATFORM_MEAN_FALLBACK = 4.0; // C, tant qu'on n'a pas assez de données réelles

export function bayesianScore(
  item: Rankable,
  platformMean: number = PLATFORM_MEAN_FALLBACK,
  minVotes: number = CONFIDENCE_THRESHOLD
): number {
  const v = item.rating_count ?? 0;
  const R = item.rating ?? 0;

  if (v === 0) return platformMean * (minVotes / (minVotes + 1)); // léger malus, aucun avis

  return (v / (v + minVotes)) * R + (minVotes / (v + minVotes)) * platformMean;
}

/** Calcule la moyenne réelle des notes sur un ensemble de professionnels (pour C). */
export function computePlatformMean(items: Rankable[]): number {
  const withRatings = items.filter((i) => (i.rating_count ?? 0) > 0);
  if (withRatings.length === 0) return PLATFORM_MEAN_FALLBACK;
  const sum = withRatings.reduce((acc, i) => acc + (i.rating ?? 0), 0);
  return sum / withRatings.length;
}

/** Trie une liste de professionnels par score pondéré décroissant (ne mute pas l'entrée). */
export function sortByWeightedRating<T extends Rankable>(items: T[]): T[] {
  const platformMean = computePlatformMean(items);
  return [...items].sort(
    (a, b) => bayesianScore(b, platformMean) - bayesianScore(a, platformMean)
  );
}
