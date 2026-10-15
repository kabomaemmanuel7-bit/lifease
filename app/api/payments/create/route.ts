import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";
import { createCheckout } from "@/lib/fedapay";

export async function POST(req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(jwt);
  const me = u.user;
  if (!me) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { request_id } = await req.json();
  const { data: r } = await admin.from("requests")
    .select("id, client_id, worker_id, amount").eq("id", request_id).single();
  if (!r || r.worker_id !== me.id)
    return NextResponse.json({ error: "interdit" }, { status: 403 });
  if (!r.amount || r.amount <= 0)
    return NextResponse.json({ error: "aucun devis accepté" }, { status: 400 });
  const { data: old } = await admin.from("payments").select("payment_url")
    .eq("request_id", r.id).eq("status", "en_attente").maybeSingle();
  if (old?.payment_url) return NextResponse.json({ url: old.payment_url });
  const { data: c } = await admin.from("profiles")
    .select("full_name").eq("id", r.client_id).single();
  const { data: cu } = await admin.auth.admin.getUserById(r.client_id);
  const commission = Math.round(r.amount * 0.05);
  try {
    const ck = await createCheckout(r.amount, r.id, c?.full_name || "Client LifEase", cu.user?.email);
    await admin.from("payments").insert({
      request_id: r.id, client_id: r.client_id, worker_id: r.worker_id,
      amount: r.amount, commission, worker_amount: r.amount - commission,
      fedapay_transaction_id: String(ck.id), payment_url: ck.url,
    });
    return NextResponse.json({ url: ck.url });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
