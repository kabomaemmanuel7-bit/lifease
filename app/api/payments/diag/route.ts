import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const k = process.env.FEDAPAY_SECRET_KEY || "";
  return NextResponse.json({
    env: process.env.FEDAPAY_ENV || null,
    keyPresent: k.length > 0,
    keyLength: k.length,
    startsSandbox: k.startsWith("sk_sandbox_"),
    startsLive: k.startsWith("sk_live_"),
    startsPublic: k.startsWith("pk_"),
    hasSpace: /\s/.test(k),
  });
}
