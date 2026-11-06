import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const env = (key: string) => Deno.env.get(key) || "";
const paystackRequest = async (path: string, secret: string, body?: unknown) => {
  const response = await fetch("https://api.paystack.co" + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== true) throw new Error("Payment provider request failed");
  return data.data;
};
const safeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};
async function validPaystackSignature(raw: string, signature: string, secret: string) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  let supplied: Uint8Array;
  try {
    if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
    supplied = new Uint8Array(signature.match(/.{2}/g)!.map((x) => parseInt(x, 16)));
  } catch { return false; }
  return safeEqual(expected, supplied);
}
function amountNgnFromKobo(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid provider amount");
  return n / 100;
}
async function markPaid(admin: any, payment: any, reference: string, amountNgn: number, paidAt?: string) {
  const { data, error } = await admin.rpc("vtg_confirm_inspection_payment", {
    p_payment_id: payment.id,
    p_provider_reference: reference,
    p_amount_ngn: amountNgn,
    p_paid_at: paidAt || new Date().toISOString(),
  });
  if (error || data !== true) throw new Error("Verified payment could not be reconciled to the VTG ledger");
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || env("SUPABASE_PUBLISHABLE_KEY");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  const secret = env("PAYSTACK_SECRET_KEY");
  if (!url || !service) return json({ error: "Payment service is not configured" }, 503);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const parsed = new URL(req.url);
  const path = parsed.pathname.split("/vtg-inspection-payments").pop() || "";

  // Paystack webhook: signature is checked against the raw request body before any ledger write.
  if (path === "/webhook") {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!secret) return json({ error: "Payment provider is not configured" }, 503);
    const raw = await req.text();
    if (!(await validPaystackSignature(raw, req.headers.get("x-paystack-signature") || "", secret))) {
      return json({ error: "Invalid webhook signature" }, 401);
    }
    let event: any;
    try { event = JSON.parse(raw); } catch { return json({ error: "Invalid webhook payload" }, 400); }
    if (event.event !== "charge.success") return json({ received: true, ignored: true });
    const reference = String(event.data?.reference || "").trim();
    if (!reference) return json({ error: "Payment reference is missing" }, 400);
    const { data: payment, error } = await admin.from("vtg_inspection_payments")
      .select("id,inspection_id,buyer_id,amount_ngn,currency,status,provider_reference")
      .eq("provider", "paystack").eq("provider_reference", reference).maybeSingle();
    if (error || !payment) return json({ error: "VTG payment record not found" }, 404);
    if (event.data?.currency !== "NGN" || amountNgnFromKobo(event.data?.amount) !== Number(payment.amount_ngn)) {
      return json({ error: "Provider amount or currency does not match the VTG invoice" }, 409);
    }
    await markPaid(admin, payment, reference, Number(payment.amount_ngn), event.data?.paid_at);
    return json({ received: true, paid: true, reference });
  }

  if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed" }, 405);
  if (!anon) return json({ error: "Authentication service is not configured" }, 503);
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Authentication required" }, 401);
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const identity = await auth.auth.getUser(token);
  if (identity.error || !identity.data.user) return json({ error: "Invalid session" }, 401);
  const user = identity.data.user;
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("role,is_active,email,account_environment").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "buyer" || profile?.is_active !== true || profile?.account_environment !== "trade") {
    return json({ error: "An active buyer trade account is required" }, 403);
  }
  if (!secret) return json({ error: "Paystack is not configured. No payment has been initiated." }, 503);

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = parsed.searchParams.get("action") || String(body.action || path.split("/").filter(Boolean).pop() || "initialize");
  const inspectionId = String(body.inspectionId || parsed.searchParams.get("inspectionId") || path.split("/").filter(Boolean)[0] || "").trim();
  const reference = String(body.reference || parsed.searchParams.get("reference") || "").trim();

  if (action === "verify" && reference) {
    const { data: payment, error } = await admin.from("vtg_inspection_payments").select("*")
      .eq("buyer_id", user.id).eq("provider", "paystack").eq("provider_reference", reference).maybeSingle();
    if (error || !payment) return json({ error: "Payment reference not found for this buyer" }, 404);
    if (payment.status === "paid") return json({ paid: true, status: "paid", reference });
    const { data: inspection } = await admin.from("vtg_inspection_requests").select("id,requested_by")
      .eq("id", payment.inspection_id).eq("requested_by", user.id).maybeSingle();
    if (!inspection) return json({ error: "Inspection not found for this buyer" }, 404);
    let result: any;
    try { result = await paystackRequest("/transaction/verify/" + encodeURIComponent(reference), secret); }
    catch { return json({ error: "Payment verification is temporarily unavailable" }, 502); }
    if (result.status !== "success" || result.currency !== "NGN" ||
        Number(result.amount) !== Math.round(Number(payment.amount_ngn) * 100) ||
        String(result.reference) !== reference) {
      return json({ paid: false, status: result.status || "pending" });
    }
    const email = String(result.customer?.email || "").toLowerCase();
    if (profile.email && email && email !== String(profile.email).toLowerCase()) {
      return json({ error: "Payment customer does not match the buyer account" }, 409);
    }
    try { await markPaid(admin, payment, reference, Number(payment.amount_ngn), result.paid_at); }
    catch { return json({ error: "Payment was verified but ledger reconciliation needs support review", reference }, 500); }
    return json({ paid: true, status: "paid", reference, amountNgn: payment.amount_ngn, currency: "NGN" });
  }

  if (action !== "initialize" || !inspectionId) return json({ error: "Inspection ID is required" }, 400);
  const { data: inspection, error: inspectionError } = await admin.from("vtg_inspection_requests")
    .select("id,reference,requested_by,buyer_fee_usd,payment_status")
    .eq("id", inspectionId).eq("requested_by", user.id).maybeSingle();
  if (inspectionError || !inspection) return json({ error: "Inspection not found for this buyer" }, 404);
  const { data: existing } = await admin.from("vtg_inspection_payments").select("*")
    .eq("inspection_id", inspectionId).eq("buyer_id", user.id).maybeSingle();
  if (inspection.payment_status === "paid" || existing?.status === "paid") {
    return json({ paid: true, status: "paid", reference: existing?.provider_reference || null });
  }
  if (existing?.status === "pending" && existing.checkout_url) {
    return json({ paid: false, authorizationUrl: existing.checkout_url, reference: existing.provider_reference, amountNgn: existing.amount_ngn, currency: "NGN", reused: true });
  }
  const rate = Number(env("VTG_INSPECTION_NGN_PER_USD"));
  const usd = Number(inspection.buyer_fee_usd);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(usd) || usd <= 0) {
    return json({ error: "Approved inspection settlement rate or fee is not configured" }, 503);
  }
  const ngn = Number((usd * rate).toFixed(2));
  const kobo = Math.round(ngn * 100);
  if (!Number.isSafeInteger(kobo) || kobo <= 0) return json({ error: "Inspection fee is invalid" }, 422);
  const referenceValue = "VTG-INS-" + inspection.id + "-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const callbackBase = env("PAYSTACK_CALLBACK_URL") || "https://vtg-backended.vercel.app/inspection-payment-callback.html";
  const callbackUrl = callbackBase + (callbackBase.includes("?") ? "&" : "?") + "inspectionId=" + encodeURIComponent(inspection.id);
  let checkout: any;
  try {
    checkout = await paystackRequest("/transaction/initialize", secret, {
      email: profile.email || user.email, amount: kobo, currency: "NGN", reference: referenceValue,
      callback_url: callbackUrl,
      metadata: { inspectionId: inspection.id, inspectionReference: inspection.reference, buyerId: user.id, amountUsd: usd, exchangeRate: rate },
    });
  } catch {
    return json({ error: "Could not initialize Paystack checkout. No payment was confirmed." }, 502);
  }
  const row = {
    inspection_id: inspection.id, buyer_id: user.id, amount_usd: usd, amount_ngn: ngn, currency: "NGN",
    provider: "paystack", provider_reference: checkout.reference || referenceValue, status: "pending",
    provider_status: "initialized", checkout_url: checkout.authorization_url, updated_at: new Date().toISOString(),
  };
  const saved = existing
    ? await admin.from("vtg_inspection_payments").update(row).eq("id", existing.id).eq("buyer_id", user.id).neq("status", "paid").select("id,provider_reference,amount_ngn,status").maybeSingle()
    : await admin.from("vtg_inspection_payments").insert(row).select("id,provider_reference,amount_ngn,status").single();
  if (saved.error || !saved.data) return json({ error: "Checkout was created but the VTG ledger did not update. Contact support before paying again." }, 409);
  await admin.from("vtg_inspection_requests").update({ payment_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", inspection.id).eq("requested_by", user.id).neq("payment_status", "paid");
  return json({ paid: false, authorizationUrl: checkout.authorization_url, reference: saved.data.provider_reference, amountNgn: ngn, currency: "NGN" });
});
