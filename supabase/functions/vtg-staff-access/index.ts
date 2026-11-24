import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Private access links.
//  kind "staff": a work email is checked on the server. Only an active staff identity (or a pending staff
//                invitation) receives an email; everyone else gets the same neutral answer and no email.
//  kind "user" : buyer / supplier / bank login help. The email plus registered name and country must match.
//  kind "self" : a signed-in buyer / supplier / bank user asks for a link to change their own login details.
// Emails are sent by Supabase Auth itself, never from a browser, so eligibility is always decided here.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const NEUTRAL_STAFF = "If this work email is registered with VTG as staff, a private link has been sent to it. Open that email on this device. If nothing arrives within a few minutes, your address is not registered, so contact your VTG administrator.";
const NEUTRAL_USER = "If those details match a VTG account, a secure link has been sent to the registered email address.";

const buckets = new Map<string, { start: number; count: number }>();
function allowed(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start >= windowMs) { buckets.set(key, { start: now, count: 1 }); return true; }
  if (b.count >= limit) return false;
  b.count += 1; return true;
}
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const norm = (v: unknown) => clean(v).toLowerCase().replace(/\s+/g, " ");
const emailOk = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const escapeLike = (e: string) => e.replace(/[\\%_]/g, (c) => "\\" + c);
const hashToken = async (t: string) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const site = (Deno.env.get("APP_SITE_URL") ?? "https://vtg-backended.vercel.app").replace(/\/$/, "");
  if (!url || !anonKey || !serviceKey) return reply({ error: "Access links are temporarily unavailable." }, 503);
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, opts);
  const mailer = createClient(url, anonKey, opts); // the client Supabase Auth uses to send its own emails

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return reply({ error: "A valid request is required." }, 400);
  if (clean(body.website)) return reply({ ok: true, message: NEUTRAL_STAFF }); // honeypot

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed("ip:" + ip, 8, 10 * 60 * 1000)) return reply({ error: "Too many requests. Please wait a few minutes and try again." }, 429);
  const kind = clean(body.kind);

  // ---- signed-in buyer / supplier / bank asks for a link to change their own login -----------------
  if (kind === "self") {
    const bearer = req.headers.get("Authorization") ?? "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
    if (!token) return reply({ error: "Please sign in first." }, 401);
    const who = await createClient(url, anonKey, opts).auth.getUser(token);
    const user = who.data?.user;
    if (who.error || !user?.email) return reply({ error: "Your session has expired. Please sign in again." }, 401);
    if (!allowed("self:" + user.id, 3, 15 * 60 * 1000)) return reply({ error: "A link was requested recently. Please check your email or wait a few minutes." }, 429);
    const p = await admin.from("profiles").select("role,is_active,account_environment").eq("id", user.id).maybeSingle();
    if (p.error || !p.data || p.data.is_active !== true || p.data.account_environment !== "trade" || !["buyer", "supplier", "bank"].includes(p.data.role)) {
      return reply({ error: "This option is for active buyer, supplier and bank accounts." }, 403);
    }
    const sent = await mailer.auth.resetPasswordForEmail(user.email, { redirectTo: `${site}/account-help.html?mode=reset&role=${p.data.role}` });
    if (sent.error) return reply({ error: "The email could not be sent right now. Please try again shortly." }, 502);
    return reply({ ok: true, message: "A secure link has been sent to your registered email address." });
  }

  const email = norm(body.email);
  if (!emailOk(email)) return reply({ error: "Enter a valid email address." }, 400);
  if (!allowed("email:" + email, 3, 15 * 60 * 1000)) return reply({ ok: true, message: kind === "user" ? NEUTRAL_USER : NEUTRAL_STAFF });

  // ---- buyer / supplier / bank login help ---------------------------------------------------------
  if (kind === "user") {
    const name = norm(body.full_name), country = norm(body.country);
    if (name.length < 2) return reply({ error: "Enter the full name registered on the account." }, 400);
    const p = await admin.from("profiles").select("id,email,full_name,country,role,is_active,account_environment")
      .ilike("email", escapeLike(email)).maybeSingle();
    const d = p.data;
    const match = d && d.is_active === true && d.account_environment === "trade" && ["buyer", "supplier", "bank"].includes(d.role)
      && norm(d.full_name) === name && (!norm(d.country) || norm(d.country) === country);
    if (match) {
      const sent = await mailer.auth.resetPasswordForEmail(String(d!.email), { redirectTo: `${site}/account-help.html?mode=reset&role=${d!.role}` });
      if (sent.error) console.error("user access email failed", sent.error.message);
    }
    return reply({ ok: true, message: NEUTRAL_USER });
  }

  // ---- staff (work email) -------------------------------------------------------------------------
  if (kind !== "staff") return reply({ error: "Unknown request." }, 400);
  const intent = clean(body.intent) === "password" ? "password" : "signin";
  const prof = await admin.from("profiles").select("id,email,role,is_active,account_environment").ilike("email", escapeLike(email)).maybeSingle();
  const d = prof.data;
  if (d && d.account_environment === "staff" && d.is_active === true) {
    let eligible = d.role === "admin";
    if (!eligible) {
      const m = await admin.from("vtg_workforce_members").select("id").eq("user_id", d.id).eq("status", "active").limit(1);
      eligible = !m.error && (m.data?.length ?? 0) > 0;
    }
    if (eligible) {
      const sent = intent === "password"
        ? await mailer.auth.resetPasswordForEmail(String(d.email), { redirectTo: `${site}/${d.role === "admin" ? "admin-password-reset" : "workforce-access"}.html` })
        : await mailer.auth.signInWithOtp({ email: String(d.email), options: { shouldCreateUser: false, emailRedirectTo: `${site}/workforce-access.html` } });
      if (sent.error) console.error("staff access email failed", sent.error.message);
    }
    return reply({ ok: true, message: NEUTRAL_STAFF });
  }

  // A pending invitation: send the sign-up link for exactly the position they were invited to.
  const inv = await admin.from("vtg_workforce_invitations").select("id,email,workspace_role,expires_at,token_hash")
    .ilike("email", escapeLike(email)).eq("status", "pending").maybeSingle();
  if (inv.data && new Date(inv.data.expires_at).getTime() > Date.now()) {
    const raw = newToken();
    const changed = await admin.from("vtg_workforce_invitations")
      .update({ token_hash: await hashToken(raw), updated_at: new Date().toISOString() }).eq("id", inv.data.id);
    if (!changed.error) {
      const sent = await admin.auth.admin.inviteUserByEmail(inv.data.email, {
        redirectTo: `${site}/workforce-accept.html?invitation=${encodeURIComponent(inv.data.id)}&token=${encodeURIComponent(raw)}`,
        data: { workforce_invitation_id: inv.data.id, workforce_role: inv.data.workspace_role },
      });
      if (sent.error) {
        console.error("staff invitation email failed", sent.error.message);
        await admin.from("vtg_workforce_invitations").update({ token_hash: inv.data.token_hash }).eq("id", inv.data.id);
      }
    }
  }
  return reply({ ok: true, message: NEUTRAL_STAFF });
});
