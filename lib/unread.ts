import { supabase } from "@/lib/supabase";

export async function countUnread(uid: string): Promise<number> {
  const { data: cs } = await supabase.from("conversations").select("id, is_group");
  const ids = (cs ?? []).map((c) => c.id as string);
  if (!ids.length) return 0;
  const groups = new Set((cs ?? []).filter((c) => c.is_group).map((c) => c.id as string));
  const { data: grs } = await supabase.from("group_reads").select("conversation_id, last_read_at").eq("user_id", uid);
  const cut: Record<string, string> = {};
  (grs ?? []).forEach((x) => { cut[x.conversation_id as string] = x.last_read_at as string; });
  const { data: ms } = await supabase
    .from("messages")
    .select("conversation_id, created_at, read_at")
    .in("conversation_id", ids)
    .neq("sender_id", uid)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  let n = 0;
  (ms ?? []).forEach((m) => {
    const cid = m.conversation_id as string;
    if (groups.has(cid)) {
      const c = cut[cid];
      if (!c || new Date(m.created_at as string) > new Date(c)) n++;
    } else if (!m.read_at) n++;
  });
  return n;
}
