const BASE = process.env.FEDAPAY_ENV === "live"
  ? "https://api.fedapay.com/v1"
  : "https://sandbox-api.fedapay.com/v1";

async function call(path: string, body: object) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.FEDAPAY_SECRET_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("FedaPay " + res.status + " " + JSON.stringify(data));
  return data;
}

export async function createCheckout(amount: number, requestId: string, name: string, email?: string) {
  const [first, ...rest] = name.split(" ");
  const d = await call("/transactions", {
    description: "LifEase demande " + requestId,
    amount, currency: { iso: "XOF" },
    callback_url: "https://lifease-orpin.vercel.app/mes-demandes",
    customer: { firstname: first, lastname: rest.join(" ") || first, email },
  });
  const tx = d["v1/transaction"] || d.transaction || d;
  const t = await call("/transactions/" + tx.id + "/token", {});
  return { id: tx.id as number, url: t.url as string };
}

export async function getTransaction(id: string) {
  const res = await fetch(BASE + "/transactions/" + id, {
    headers: { Authorization: "Bearer " + process.env.FEDAPAY_SECRET_KEY },
  });
  if (!res.ok) throw new Error("FedaPay " + res.status);
  const d = await res.json();
  return d["v1/transaction"] || d.transaction || d;
}
