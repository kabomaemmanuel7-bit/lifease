import { NextResponse } from "next/server";
import crypto from "crypto";
import { admin } from "@/lib/supabase-admin";
import { getTransaction } from "@/lib/fedapay";

const MAP: Record<string, string> = {
  approved: "paye", declined: "refuse", canceled: "annule",
  transferred: "transfere", refunded: "rembourse",
};

export async function POST(req: Request) {
  const body = await req.text();
  const head = req.headers.get("x-fedapay-signature") || "";
  const parts: Record<string, string> = Object.fromEntries(
    head.split(",").map((p) => p.split("="))
  );
  const expected = crypto
    .createHmac("sha256", process.env.FEDAPAY_WEBHOOK_SECRET!)
    .update(parts.t + "." + body).digest("hex");
  const ok = parts.s && parts.s.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(parts.s), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "signature" }, { status: 400 });
  const evt = JSON.parse(body);
  const id = String(evt.entity?.id || "");
  if (!id) return NextResponse.json({ ok: true });
  const tx = await getTransaction(id);
  const status = MAP[tx.status];
  const { data: p } = await admin.from("payments")
    .select("id, request_id, amount").eq("fedapay_transaction_id", id).maybeSingle();
  if (status && p) {
    if (status === "paye") {
      await admin.from("payments")
        .update({ status, paid_at: new Date().toISOString() })
        .eq("id", p.id).eq("status", "en_attente");
      await admin.from("requests")
        .update({ status: "terminee", payment_status: "paye", amount: p.amount })
        .eq("id", p.request_id).eq("status", "acceptee");
    } else if (status === "transfere" || status === "rembourse") {
      await admin.from("payments").update({ status }).eq("id", p.id);
    } else {
      await admin.from("payments").update({ status })
        .eq("id", p.id).eq("status", "en_attente");
    }
  }
  return NextResponse.json({ ok: true });
}
