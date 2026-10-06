"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null };
type Member = { user_id: string; role: string };

export default function GroupInfoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    setMe(s.session?.user.id ?? null);
    const { data: g } = await supabase.from("conversations").select("name").eq("id", id).maybeSingle();
    if (!g) { setError("Groupe introuvable."); return; }
    setName(g.name ?? "");
    const { data: mem } = await supabase.from("conversation_members").select("user_id, role").eq("conversation_id", id);
    const ms = (mem ?? []) as Member[];
    setMembers(ms);
    const { data: dir } = await supabase.from("worker_directory").select("id, full_name").in("id", ms.map((x) => x.user_id));
    const map: Record<string, Person> = {};
    ((dir ?? []) as Person[]).forEach((p) => { map[p.id] = p; });
    setPeople(map);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!adding || q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("worker_directory").select("id, full_name").ilike("full_name", "%" + q.trim() + "%").limit(20);
      setFound(((data ?? []) as Person[]).filter((p) => !members.some((m) => m.user_id === p.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [q, adding, members]);

  async function call(fn: string, args: Record<string, unknown>, msg: string) {
    setError("");
    setOk("");
    const { error: err } = await supabase.rpc(fn, args);
    if (err) { setError("Action impossible : " + err.message); return false; }
    setOk(msg);
    await load();
    return true;
  }

  async function addAll() {
    if (picked.length === 0) return;
    if (await call("add_group_members", { p_conv: id, p_members: picked }, "Membres ajoutés.")) { setPicked([]); setAdding(false); setQ(""); }
  }

  async function leave() {
    if (!confirm("Quitter ce groupe ?")) return;
    const { error: err } = await supabase.rpc("leave_group", { p_conv: id });
    if (err) { setError("Action impossible : " + err.message); return; }
    router.push("/messages");
  }

  const isAdmin = members.some((m) => m.user_id === me && m.role === "admin");
  if (!me) return <main className="mx-auto min-h-screen max-w-md bg-beige-50 px-5 py-6 text-ink-600">{error || "Chargement…"}</main>;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-beige-50 pb-10">
      <header className="flex items-center gap-3 border-b border-ink-400/20 bg-white px-4 py-3">
        <Link href={"/messages/groupe/" + id} className="text-ink-600">←</Link>
        <p className="font-medium text-ink-900">Infos du groupe</p>
      </header>
      <div className="space-y-4 px-4 py-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {ok && <p className="text-sm text-green-700">{ok}</p>}
        <div>
          <p className="mb-1 text-xs text-ink-400">Nom du groupe</p>
          {isAdmin ? (
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-md border border-ink-400/30 bg-white px-3 py-2 text-sm" />
              <button onClick={() => call("rename_group", { p_conv: id, p_name: name }, "Nom modifié.")} className="rounded-md bg-wine-700 px-3 py-2 text-sm text-white">Enregistrer</button>
            </div>
          ) : (
            <p className="text-ink-900">{name}</p>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-ink-400">{members.length} membres</p>
            {isAdmin && <button onClick={() => setAdding(!adding)} className="text-sm font-medium text-wine-700">{adding ? "Fermer" : "+ Ajouter"}</button>}
          </div>
          {adding && (
            <div className="mb-3 rounded-md bg-white p-3 shadow-sm">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un prestataire (2 lettres min.)" className="w-full rounded-md border border-ink-400/30 px-3 py-2 text-sm" />
              {found.map((p) => (
                <button key={p.id} onClick={() => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id])} className="block w-full py-2 text-left text-sm text-ink-900">{picked.includes(p.id) ? "✅ " : "⬜ "}{p.full_name ?? "Membre"}</button>
              ))}
              {picked.length > 0 && <button onClick={addAll} className="mt-2 block w-full rounded-md bg-wine-700 py-2 text-center text-sm text-white">Ajouter {picked.length} personne{picked.length > 1 ? "s" : ""}</button>}
            </div>
          )}
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 border-b border-ink-400/10 py-2">
              <span>👤</span>
              <p className="flex-1 text-ink-900">{m.user_id === me ? "Toi" : people[m.user_id]?.full_name ?? "Membre"}{m.role === "admin" && <span className="ml-2 text-xs text-wine-700">admin</span>}</p>
              {isAdmin && m.user_id !== me && <button onClick={() => { if (confirm("Retirer ce membre ?")) call("remove_group_member", { p_conv: id, p_user: m.user_id }, "Membre retiré."); }} className="text-sm text-wine-700">Retirer</button>}
            </div>
          ))}
        </div>
        <button onClick={leave} className="block w-full rounded-md border border-wine-700 py-3 text-center text-wine-700">Quitter le groupe</button>
      </div>
    </main>
  );
}
