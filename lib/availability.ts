export type WorkerStatus = "disponible" | "occupe" | "indisponible";

/**
 * Calcule le statut affiche en tenant compte de la plage horaire.
 * "occupe" et "indisponible" (choisis manuellement) restent prioritaires.
 * "disponible" bascule automatiquement en "indisponible" hors de la plage
 * horaire definie (availability_start / availability_end), si elle existe.
 */
export function getEffectiveStatus(
  status: WorkerStatus,
  availabilityStart: string | null,
  availabilityEnd: string | null
): WorkerStatus {
  if (status !== "disponible") return status;
  if (!availabilityStart || !availabilityEnd) return status;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = availabilityStart.split(":").map(Number);
  const [endH, endM] = availabilityEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const withinRange =
    startMinutes <= endMinutes
      ? currentMinutes >= startMinutes && currentMinutes <= endMinutes
      : currentMinutes >= startMinutes || currentMinutes <= endMinutes;

  return withinRange ? "disponible" : "indisponible";
}
