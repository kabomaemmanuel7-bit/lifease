"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

type EntryType = "competence" | "diplome" | "experience" | "stage" | "formation";

type CvEntry = {
  id: string;
  type: EntryType;
  title: string;
  institution: string | null;
  period: string | null;
  description: string | null;
};

const typeOptions: { value: EntryType; label: string }[] = [
  { value: "diplome", label: "Diplôme" },
  { value: "formation", label: "Formation" },
  { value: "experience", label: "Expérience" },
  { value: "stage", label: "Stage" },
  { value: "competence", label: "Compétence" },
];

export default function CvPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<EntryType>("competence");
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/connexion");
        return;
      }
      setUserId(session.user.id);

      const { data } = await supabase
        .from("worker_cv_entries")
        .select("id, type, title, institution, period, description")
        .eq("worker_id", session.user.id)
        .order("created_at", { ascending: false });

      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim()) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("worker_cv_entries")
      .insert({
        worker_id: userId,
        type,
        title: title.trim(),
        institution: institution.trim() || null,
        period: period.trim() || null,
        description: description.trim() || null,
      })
      .select("id, type, title, institution, period, description")
      .single();
    setSaving(false);

    if (!error && data) {
      setEntries((prev) => [data, ...prev]);
      setTitle("");
      setInstitution("");
      setPeriod("");
      setDescription("");
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("worker_cv_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-ink-600">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push("/travailleur/mon-profil")} aria-label="Retour">
          <ChevronLeft className="h-5 w-5 text-ink-900" />
        </button>
        <h1 className="text-lg font-medium text-ink-900">Mon CV</h1>
      </div>

      <form onSubmit={handleAdd} className="mb-8">
        <label className="mb-1.5 block text-sm font-medium text-ink-900">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EntryType)}
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
        >
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <Input
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : CAP Électrotechnique"
          required
        />
        <Input
          label="Établissement / Employeur (optionnel)"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="Ex : Lycée Technique d'Akassato"
        />
        <Input
          label="Période (optionnel)"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Ex : 2021 - 2023"
        />
        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          Description (optionnel)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mb-4 w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 focus:border-wine-400 focus:outline-none"
        />

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Ajout…" : "Ajouter au CV"}
        </Button>
      </form>

      <p className="mb-3 text-sm font-medium text-ink-600">Mes entrées</p>
      <div className="flex flex-col gap-3">
        {entries.length === 0 && (
          <p className="text-center text-sm text-ink-600">Aucune entrée pour le moment.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between rounded-md border border-wine-100 bg-white p-3"
          >
            <div>
              <p className="text-xs uppercase text-wine-600">
                {typeOptions.find((o) => o.value === entry.type)?.label}
              </p>
              <p className="text-sm font-medium text-ink-900">{entry.title}</p>
              {entry.institution && (
                <p className="text-xs text-ink-600">{entry.institution}</p>
              )}
              {entry.period && <p className="text-xs text-ink-400">{entry.period}</p>}
            </div>
            <button onClick={() => handleDelete(entry.id)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
