type Props = { d: { contact_name?: string | null; contact_phone?: string | null; address?: string | null; google_maps_link?: string | null; video_url?: string | null } };
const link = "font-medium text-wine-600 underline";

export default function RequestDetails({ d }: Props) {
  if (!d.contact_name && !d.contact_phone && !d.address && !d.google_maps_link && !d.video_url) return null;
  return (
    <div className="mt-3 space-y-1 rounded-xl bg-beige-50 p-3 text-xs text-ink-600">
      {d.contact_name && <p>👤 Contact : {d.contact_name}</p>}
      {d.contact_phone && (
        <p>📞 <a className={link} href={"tel:" + d.contact_phone.replace(/\s/g, "")}>Appeler {d.contact_phone}</a></p>
      )}
      {d.address && <p>🏠 Adresse : {d.address}</p>}
      {d.google_maps_link && (
        <p>📍 <a className={link} href={d.google_maps_link} target="_blank" rel="noreferrer">Ouvrir dans Google Maps</a></p>
      )}
      {d.video_url && (
        <p>🎥 <a className={link} href={d.video_url} target="_blank" rel="noreferrer">Voir la vidéo de la panne</a></p>
      )}
    </div>
  );
}
