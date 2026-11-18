import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const html = (body: string, status = 200) => new Response(body, {
  status,
  headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
});
const page = (title: string, message: string, form = "") => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;background:#f3efe6;color:#17191b;font:16px/1.6 Arial,sans-serif"><main style="max-width:560px;margin:8vh auto;padding:36px;background:#fff;border:1px solid #e5dfd3"><div style="height:4px;background:#702a30;margin:-36px -36px 28px"></div><p style="font-size:12px;letter-spacing:.18em;color:#702a30;font-weight:bold">VTG — THE PRIVATE TRADE HOUSE</p><h1 style="font: bold 30px Georgia,serif">${title}</h1><p>${message}</p>${form}<p style="font-size:12px;color:#6b7280;margin-top:28px">Essential account, security and transaction emails may still be sent.</p></main></body></html>`;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] ?? c));
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
async function hashToken(token: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}
function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
function clients(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const user = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, admin, token };
}
async function issue(req: Request) {
  const { user, admin, token: jwt } = clients(req);
  if (!jwt) return json({ error: "Sign in to request an email preference link." }, 401);
  const identity = await user.auth.getUser(jwt);
  const account = identity.data.user;
  if (identity.error || !account?.email || !account.email_confirmed_at) return json({ error: "A verified account is required." }, 401);

  const recent = await admin.from("vtg_email_preference_tokens").select("created_at")
    .eq("user_id", account.id).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (recent.data?.created_at && Date.now() - new Date(recent.data.created_at).getTime() < 60_000) {
    return json({ error: "A preference link was sent recently. Please wait a minute before requesting another." }, 429);
  }

  const raw = randomToken();
  const tokenHash = await hashToken(raw);
  const { error: insertError } = await admin.from("vtg_email_preference_tokens").insert({
    token_hash: tokenHash, user_id: account.id, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
  });
  if (insertError) return json({ error: "Could not create a preference link." }, 500);

  const appUrl = Deno.env.get("VTG_APP_URL")?.replace(/\/$/, "");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("VTG_EMAIL_FROM");
  if (!appUrl || !apiKey || !from) {
    await admin.from("vtg_email_preference_tokens").delete().eq("token_hash", tokenHash);
    return json({ error: "Email delivery is not configured for preference links." }, 503);
  }
  const link = appUrl + "/api/auth/email-preferences/" + raw;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [account.email], subject: "Your VTG email preferences",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#17191b"><div style="height:4px;background:#702a30"></div><h1 style="font-family:Georgia,serif">Manage email preferences</h1><p>You requested a secure link to manage VTG trade and marketing updates. The link expires in seven days.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 22px;background:#702a30;color:#fff;text-decoration:none">Review email preferences</a></p><p>If you did not request this email, you can ignore it. Your preferences will not change unless you confirm on the page.</p><p style="font-size:12px;color:#66717a">Essential account, security and transaction messages may still be sent.</p></div>`,
      text: "Manage your VTG email preferences using this secure link (expires in seven days): " + link + "\n\nYour preferences will not change unless you confirm on the page.",
    }),
  });
  if (!response.ok) {
    await admin.from("vtg_email_preference_tokens").delete().eq("token_hash", tokenHash);
    return json({ error: "We could not send the preference email. Please try again later." }, 502);
  }
  return json({ ok: true, message: "A secure email preference link has been sent to your verified email address." });
}
async function confirm(req: Request, token: string) {
  if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
    return html(page("Link unavailable", "This preference link is invalid or has expired."), 404);
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await hashToken(token);
  const found = await admin.from("vtg_email_preference_tokens").select("user_id,expires_at,consumed_at")
    .eq("token_hash", tokenHash).maybeSingle();
  if (found.error || !found.data || found.data.consumed_at || new Date(found.data.expires_at).getTime() <= Date.now()) {
    return html(page("Link unavailable", "This preference link is invalid, expired or has already been used."), 404);
  }
  if (req.method === "GET") {
    const form = `<form method="post" action="/api/auth/email-preferences/confirm"><input type="hidden" name="token" value="${token}"><button style="border:0;background:#702a30;color:white;padding:14px 22px;font-weight:bold;cursor:pointer">Confirm unsubscribe</button></form>`;
    return html(page("Confirm your preference", "If you continue, VTG trade and marketing updates will be switched off for your account. Opening this link alone does not change your preference.", form));
  }
  const { data: consumed, error: consumeError } = await admin.from("vtg_email_preference_tokens")
    .update({ consumed_at: new Date().toISOString() }).eq("token_hash", tokenHash).is("consumed_at", null)
    .gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle();
  if (consumeError || !consumed) return html(page("Link unavailable", "This preference link has expired or has already been used."), 409);
  const { error: prefError } = await admin.from("vtg_email_preferences").upsert({
    user_id: consumed.user_id, marketing_subscribed: false, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (prefError) return html(page("Unable to update", "We could not update your preference just now. Please request a new link and try again."), 500);
  return html(page("Preference updated", "You have been unsubscribed from VTG trade and marketing updates. Your essential account, security and transaction emails are unaffected."));
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const url = new URL(req.url);
  if (req.method === "POST" && !url.pathname.endsWith("/confirm")) return await issue(req);
  if (req.method === "GET" && url.pathname.endsWith("/confirm")) return await confirm(req, url.searchParams.get("token") ?? "");
  if (req.method === "POST" && url.pathname.endsWith("/confirm")) {
    const type = req.headers.get("content-type") ?? "";
    let token = "";
    if (type.includes("application/x-www-form-urlencoded")) {
      token = new URLSearchParams(await req.text()).get("token") ?? "";
    } else {
      const body = await req.json().catch(() => ({}));
      token = typeof body.token === "string" ? body.token : "";
    }
    return await confirm(req, token);
  }
  if (req.method === "GET") {
    const token = url.searchParams.get("token") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return await confirm(req, token);
  }
  return json({ error: "Not found." }, 404);
});