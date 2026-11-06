import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const buckets = new Map<string, { start: number; count: number }>();

function allowed(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= 10 * 60 * 1000) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  if (bucket.count >= 5) return false;
  bucket.count += 1;
  return true;
}
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST to submit a support request." }, 405);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return reply({ error: "A valid support request is required." }, 400);

  // A simple honeypot keeps ordinary bots out without collecting extra personal data.
  if (clean(body.website)) return reply({ ok: true, message: "Your support request has been received." }, 201);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return reply({ error: "Too many requests. Please wait before submitting another support request." }, 429);

  const role = clean(body.role).toLowerCase();
  const email = clean(body.email).toLowerCase();
  const issue = clean(body.issue);
  const description = clean(body.description);
  if (!["buyer", "supplier", "bank", "admin"].includes(role)) return reply({ error: "Choose a valid VTG account type." }, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "Enter a valid contact email." }, 400);
  if (issue.length < 3 || issue.length > 120 || description.length < 10 || description.length > 2000) {
    return reply({ error: "Check the issue and description fields, then try again." }, 400);
  }
  if (/(password|verification code|one.time code|otp\s*[:=])/i.test(description)) {
    return reply({ error: "For your security, do not include passwords or verification codes." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "Support is temporarily unavailable. Please email vintageafricatrade@gmail.com." }, 503);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await db.from("vtg_account_support_requests").insert({
    account_role: role,
    contact_email: email,
    issue,
    description,
  }).select("id,created_at").single();

  if (result.error || !result.data) {
    console.error("VTG account support request could not be stored", result.error?.message);
    return reply({ error: "VTG could not save your request. Please try again or email vintageafricatrade@gmail.com." }, 500);
  }

  return reply({
    ok: true,
    requestId: result.data.id,
    message: "Your support request has been received by VTG. Keep an eye on your inbox for a response.",
    emailNotification: "queued_for_support_review",
  }, 201);
});
