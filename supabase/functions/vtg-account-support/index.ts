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
  if (!["POST", "GET", "PATCH"].includes(req.method)) return reply({ error: "Method not allowed." }, 405);

  if (req.method === "GET" || req.method === "PATCH") {
    const bearer = req.headers.get("Authorization") ?? "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service || !token) return reply({ error: "Administrator authentication required." }, 401);
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const identity = await auth.auth.getUser(token);
    if (identity.error || !identity.data.user) return reply({ error: "Invalid session." }, 401);
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const profile = await db.from("profiles").select("role,is_active,account_environment").eq("id", identity.data.user.id).maybeSingle();
    if (profile.error || profile.data?.role !== "admin" || profile.data?.is_active !== true || profile.data?.account_environment !== "staff") {
      return reply({ error: "Active VTG administrator access is required." }, 403);
    }
    if (req.method === "GET") {
      const result = await db.from("vtg_account_support_requests").select("id,account_role,contact_email,issue,description,status,created_at,updated_at").order("created_at", { ascending: false }).limit(100);
      if (result.error) return reply({ error: "Could not load the support inbox." }, 500);
      return reply({ requests: result.data ?? [] });
    }
    const update = await req.json().catch(() => ({}));
    const id = clean(update.id), status = clean(update.status);
    if (!id || !["open", "in_review", "resolved", "closed"].includes(status)) return reply({ error: "A support request ID and valid status are required." }, 400);
    const result = await db.from("vtg_account_support_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id,status,updated_at").maybeSingle();
    if (result.error || !result.data) return reply({ error: "Support request not found or could not be updated." }, 404);
    return reply({ request: result.data });
  }

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
    message: "Your support request has been recorded. VTG support can review it through the administrator inbox.",
    emailNotification: "queued_for_support_review",
  }, 201);
});
