import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const pathways: Record<string, string> = {
  "Trade & Commercial": "Commercial partnership",
  "Logistics & Shipping": "Service / network partnership",
  "Warehouse & Storage": "Storage / fulfilment infrastructure partnership",
  "Finance & Payments": "Financial / payment relationship",
  "Supply & Manufacturing": "Supplier / manufacturing relationship",
  "Technology": "Technology integration",
  "Strategic & Institutional": "Institutional / strategic collaboration",
};
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
);
const reference = () => "VTG-P" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: { code: "BACKEND_NOT_CONFIGURED", message: "Partnership submissions are temporarily unavailable." } }, 503);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return reply({ error: { code: "INVALID_BODY", message: "Please submit a valid partnership proposal." } }, 400);
  }

  // Honeypot: real visitors never see or fill this field.
  if (clean((body as Record<string, unknown>).website, 200)) {
    return reply({ ok: true, reference: null, message: "Your proposal has been received." }, 201);
  }

  const b = body as Record<string, unknown>;
  const organization = clean(b.organization, 180);
  const contact = clean(b.contact, 140);
  const email = clean(b.email, 254).toLowerCase();
  const country = clean(b.country, 100);
  const countryCode = clean(b.countryCode, 8);
  const phoneNumber = clean(b.phoneNumber, 40);
  const pathway = clean(b.pathway, 80);
  const offer = typeof b.offer === "string" ? b.offer.trim().slice(0, 5000) : "";
  const need = typeof b.need === "string" ? b.need.trim().slice(0, 5000) : "";
  const markets = clean(b.markets, 500);
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 3000) : "";
  const missing = [
    ["organization", organization], ["contact", contact], ["email", email],
    ["country", country], ["countryCode", countryCode], ["phoneNumber", phoneNumber],
    ["pathway", pathway], ["offer", offer], ["need", need],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    return reply({ error: { code: "VALIDATION_ERROR", message: "Please complete all required partnership fields.", fields: missing } }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply({ error: { code: "INVALID_EMAIL", message: "Enter a valid work email address." } }, 400);
  }
  if (!/^\+\d{1,4}$/.test(countryCode)) {
    return reply({ error: { code: "INVALID_COUNTRY_CODE", message: "Choose a valid country calling code." } }, 400);
  }
  if (!pathways[pathway]) {
    return reply({ error: { code: "INVALID_PATHWAY", message: "Select a valid VTG partnership pathway." } }, 400);
  }
  if (offer.length < 15 || need.length < 15) {
    return reply({ error: { code: "INSUFFICIENT_DETAIL", message: "Please provide a little more detail in both proposal fields." } }, 400);
  }

  const forwarded = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const ipHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(forwarded))
    .then((hash) => Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, "0")).join(""));
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const recent = await db.from("vtg_partnership_proposals").select("id", { count: "exact", head: true })
    .eq("source_ip_hash", ipHash).gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (recent.error) return reply({ error: { code: "RATE_LIMIT_CHECK_FAILED", message: "We could not verify the submission right now. Please try again shortly." } }, 503);
  if ((recent.count ?? 0) >= 3) {
    return reply({ error: { code: "RATE_LIMITED", message: "Too many proposals have been submitted from this connection. Please try again later." } }, 429);
  }

  const ref = reference();
  const type = pathways[pathway];
  const inserted = await db.from("vtg_partnership_proposals").insert({
    reference: ref, organization, contact_person: contact, contact_email: email,
    country, country_calling_code: countryCode, phone_number: phoneNumber,
    pathway, partnership_type: type, markets: markets || null, offer,
    requested_support: need, additional_context: message || null,
    source_ip_hash: ipHash,
    user_agent: clean(req.headers.get("user-agent"), 500) || null,
  }).select("id").single();
  if (inserted.error) {
    return reply({ error: { code: "SAVE_FAILED", message: "We could not save your proposal. Please try again." } }, 503);
  }

  const to = Deno.env.get("PARTNERSHIP_TEAM_EMAIL") || Deno.env.get("CONTACT_TEAM_EMAIL") || "vintageafricatrade@gmail.com";
  const from = Deno.env.get("VTG_EMAIL_FROM");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  let emailStatus = "not_configured";
  let emailError: string | null = null;
  if (from && resendKey) {
    const text = [
      "VTG PARTNERSHIP PROPOSAL", "Reference: " + ref, "",
      "Organization / company: " + organization, "Contact person: " + contact,
      "Work email: " + email, "Phone: " + countryCode + " " + phoneNumber,
      "Country / market: " + country, "Partnership pathway: " + pathway,
      "Partnership type: " + type, "Markets supported: " + (markets || "Not specified"), "",
      "What the organization can offer VTG:", offer, "",
      "What they want VTG to provide / help build:", need, "",
      "Additional context:", message || "None",
    ].join("\n");
    const html = "<!doctype html><html><body><h2>VTG Partnership Proposal</h2><p><b>Reference:</b> " + escapeHtml(ref) +
      "</p><p><b>Organization:</b> " + escapeHtml(organization) + "</p><p><b>Contact:</b> " + escapeHtml(contact) +
      " (" + escapeHtml(email) + ")</p><p><b>Phone:</b> " + escapeHtml(countryCode + " " + phoneNumber) +
      "</p><p><b>Country:</b> " + escapeHtml(country) + "</p><p><b>Pathway:</b> " + escapeHtml(pathway) +
      "</p><p><b>Markets:</b> " + escapeHtml(markets || "Not specified") + "</p><h3>Offer to VTG</h3><p>" +
      escapeHtml(offer).replace(/\n/g, "<br>") + "</p><h3>Requested collaboration</h3><p>" +
      escapeHtml(need).replace(/\n/g, "<br>") + "</p><h3>Additional context</h3><p>" +
      escapeHtml(message || "None").replace(/\n/g, "<br>") + "</p></body></html>";
    try {
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json", "Idempotency-Key": "vtg-partnership-" + ref },
        body: JSON.stringify({ from, to: [to], reply_to: email, subject: "VTG Partnership Proposal | " + pathway + " | " + ref, text, html }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await sent.json().catch(() => ({}));
      if (!sent.ok) throw new Error(typeof result?.message === "string" ? result.message : "Email provider returned HTTP " + sent.status);
      emailStatus = "sent";
    } catch (error) {
      emailStatus = "failed";
      emailError = String((error as Error)?.message || error).slice(0, 500);
    }
  }

  await db.from("vtg_partnership_proposals").update({
    email_status: emailStatus, email_error: emailError,
  }).eq("id", inserted.data.id);

  return reply({
    ok: true, reference: ref, pathway, partnershipType: type,
    emailStatus,
    message: emailStatus === "sent"
      ? "Your proposal has been saved and an email notification has been sent to the VTG partnership team."
      : "Your proposal has been securely saved. The team email notification is not configured or could not be delivered; VTG can still review the submission.",
  }, 201);
});