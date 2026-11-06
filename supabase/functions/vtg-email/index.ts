import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { deliverTrackedEmail } from "../_shared/vtg-email.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!url || !anon || !service || !token) return out({ error: "Authentication required" }, 401);

  const userDb = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false } });
  const identity = await userDb.auth.getUser(token);
  if (identity.error || !identity.data.user || !identity.data.user.email_confirmed_at) return out({ error: "A verified account is required." }, 401);

  const user = identity.data.user;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await admin.from("profiles").select("role,is_active,full_name").eq("id", user.id).maybeSingle();
  if (profile.error || !profile.data?.is_active) return out({ error: "Active account required." }, 403);

  const body = await req.json().catch(() => ({}));
  if (body.event === "onboarding") {
    let role = profile.data.role;
    let eventType = "account_welcome";
    let subject = "Welcome to VTG";
    let heading = "Welcome to VTG";
    let message = "Your VTG account is ready. Sign in to explore your workspace and continue your trade activities.";
    let eventKey = "onboarding:" + user.id;
    if (role === "buyer") {
      // A buyer may have applied for a business role; only send the application receipt for a pending request.
      const application = await admin.from("role_requests").select("id,requested_role,status,organization_name")
        .eq("user_id", user.id).in("requested_role", ["supplier", "bank"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (application.data?.status === "pending") {
        role = application.data.requested_role;
        eventType = "business_application_received";
        subject = "VTG has received your business application";
        heading = "Application received";
        message = "Your " + role + " account application for " + (application.data.organization_name || "your organisation") + " has been received. It is awaiting VTG review. We will email you when a decision is made.";
        eventKey = "application-received:" + application.data.id;
      }
    }
    const result = await deliverTrackedEmail(admin, {
      userId: user.id, to: user.email, eventType, eventKey,
      idempotencyKey: "vtg-" + eventKey,
      subject, heading, body: message,
      ctaLabel: "Open VTG", ctaUrl: (Deno.env.get("VTG_APP_URL") || "https://vtg-staging.vercel.app") + "/",
    });
    return out({ ok: true, email: result });
  }

  if (body.event === "notification" && typeof body.notification_id === "string") {
    const notification = await admin.from("vtg_notifications")
      .select("id,title,body,created_at").eq("id", body.notification_id).eq("user_id", user.id).maybeSingle();
    if (notification.error || !notification.data) return out({ error: "Notification not found." }, 404);
    const item = notification.data;
    const result = await deliverTrackedEmail(admin, {
      userId: user.id, to: user.email, eventType: "dashboard_notification",
      eventKey: "notification:" + item.id, idempotencyKey: "vtg-notification-" + item.id,
      subject: item.title || "A new VTG account update",
      heading: item.title || "A new VTG account update",
      body: item.body || "There is a new update in your VTG workspace.",
      ctaLabel: "View your workspace",
      ctaUrl: (Deno.env.get("VTG_APP_URL") || "https://vtg-staging.vercel.app") + "/",
    });
    return out({ ok: true, email: result });
  }

  return out({ error: "Unsupported email event." }, 400);
});
