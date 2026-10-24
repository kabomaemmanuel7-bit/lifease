import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";
import { createCheckout } from "@/lib/fedapay";

export async function POST(req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(jwt);
  const me = u.user;
  if (!me) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { request_id, amount } = await req.json();
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt < 100 || amt > 5000000)
    return NextResponse.json({ error: "montant invalide" }, { status: 400 });
  const { data: r } = await admin.from("requests")
    .select("id, client_id, worker_id, status").eq("id", request_id).single();
  if (!r || r.worker_id !== me.id)
    return NextResponse.json({ error: "interdit" }, { status: 403 });
  if (r.status !== "acceptee")
    return NextResponse.json({ error: "demande non acceptée" }, { status: 400 });
  await admin.from("payments").update({ status: "annule" })
    .eq("request_id", r.id).eq("status", "en_attente");
  const { data: c } = await admin.from("profiles")
    .select("full_name").eq("id", r.client_id).single();
  const { data: cu } = await admin.auth.admin.getUserById(r.client_id);
  const commission = Math.round(amt * 0.05);
  try {
    const ck = await createCheckout(amt, r.id, c?.full_name || "Client LifEase", cu.user?.email);
    await admin.from("payments").insert({
      request_id: r.id, client_id: r.client_id, worker_id: r.worker_id,
      amount: amt, commission, worker_amount: amt - commission,
      fedapay_transaction_id: String(ck.id), payment_url: ck.url,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
