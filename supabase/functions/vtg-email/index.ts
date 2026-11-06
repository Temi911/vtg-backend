import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] ?? char));

type VtgEmailInput = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  idempotencyKey?: string;
};

async function sendVtgEmail(input: VtgEmailInput) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("VTG_EMAIL_FROM");
  const appUrl = (Deno.env.get("VTG_APP_URL") || "https://vtg-staging.vercel.app").replace(/\/$/, "");
  if (!apiKey || !from) throw new Error("VTG email service is not configured. Set RESEND_API_KEY and VTG_EMAIL_FROM.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) throw new Error("A valid recipient email is required.");

  const heading = escapeHtml(input.heading);
  const body = escapeHtml(input.body).replace(/\n/g, "<br>");
  const ctaUrl = input.ctaUrl && input.ctaUrl.startsWith(appUrl + "/") ? input.ctaUrl : "";
  const cta = ctaUrl && input.ctaLabel
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#702A30;color:#fff;text-decoration:none;padding:12px 18px;font-weight:700;font-size:13px">${escapeHtml(input.ctaLabel)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f3efe6;color:#17191b;font-family:Arial,sans-serif"><div style="max-width:620px;margin:32px auto;padding:36px 30px;background:#fff"><p style="margin:0 0 26px;color:#702A30;font-size:11px;letter-spacing:3px;font-weight:700">VTG — THE PRIVATE TRADE HOUSE</p><h1 style="font-size:24px;line-height:1.25;margin:0 0 18px">${heading}</h1><p style="font-size:15px;line-height:1.7;color:#454545">${body}</p>${cta}<hr style="border:0;border-top:1px solid #e8e2d8;margin:34px 0 18px"><p style="font-size:11px;line-height:1.6;color:#777">This is an automated VTG account notification. For account-specific details, sign in to your VTG workspace. Please do not reply with passwords or payment credentials.</p></div></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html,
      text: `${input.heading}\n\n${input.body}\n\nSign in to your VTG workspace: ${appUrl}`,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : `Resend returned HTTP ${response.status}`);
  return { id: typeof result?.id === "string" ? result.id : null };
}

async function deliverTrackedEmail(
  db: any,
  input: VtgEmailInput & { userId?: string | null; eventType: string; eventKey: string },
) {
  const existing = await db.from("vtg_email_deliveries").select("status,resend_message_id")
    .eq("event_key", input.eventKey).maybeSingle();
  if (existing.data?.status === "sent") return { sent: true, duplicate: true, id: existing.data.resend_message_id };

  const claim = await db.from("vtg_email_deliveries").upsert({
    user_id: input.userId || null,
    event_key: input.eventKey,
    event_type: input.eventType,
    recipient_email: input.to,
    status: "pending",
    error_message: null,
  }, { onConflict: "event_key" }).select("id").single();
  if (claim.error) throw new Error("Could not record email delivery attempt.");

  try {
    const sent = await sendVtgEmail(input);
    await db.from("vtg_email_deliveries").update({
      status: "sent", resend_message_id: sent.id, sent_at: new Date().toISOString(), error_message: null,
    }).eq("event_key", input.eventKey);
    return { sent: true, duplicate: false, id: sent.id };
  } catch (error) {
    await db.from("vtg_email_deliveries").update({
      status: "failed", error_message: String((error as Error)?.message || error).slice(0, 500),
    }).eq("event_key", input.eventKey);
    throw error;
  }
}


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
  if (profile.error || !profile.data) return out({ error: "Account profile not found." }, 403);

  const body = await req.json().catch(() => ({}));
  // Pending supplier/bank applicants may receive only their application receipt.
  // This does not activate the account or grant dashboard permissions.
  const pendingApplication = await admin.from("role_requests").select("id,requested_role,status,organization_name")
    .eq("user_id", user.id).in("requested_role", ["supplier", "bank"])
    .eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const isPendingApplicant = Boolean(pendingApplication.data);
  if (!profile.data.is_active && !(body.event === "onboarding" && isPendingApplicant)) {
    return out({ error: "Active account required." }, 403);
  }

  if (body.event === "onboarding") {
    let role = profile.data.role;
    let eventType = "account_welcome";
    let subject = "Welcome to VTG";
    let heading = "Welcome to VTG";
    let message = "Your VTG account is ready. Sign in to explore your workspace and continue your trade activities.";
    let eventKey = "onboarding:" + user.id;
    if (isPendingApplicant) {
        role = pendingApplication.data.requested_role;
        eventType = "business_application_received";
        const roleLabel = role === "supplier" ? "Supplier" : "Bank / financial institution";
        subject = "VTG " + roleLabel + " Account Application Received — Awaiting Review";
        heading = "Your application has been received";
        message = "Dear " + (profile.data.full_name || "Applicant") + ",\n\nThank you for choosing VTG — The Private Trade House. We have successfully received the " + roleLabel.toLowerCase() + " account application for " + (application.data.organization_name || "your organisation") + ".\n\nAPPLICATION STATUS: PENDING ADMINISTRATIVE REVIEW\n\nOur team will review the organisation information and supporting details submitted with your application. This review helps us assess the account request and determine whether further information is required.\n\nWHAT HAPPENS NEXT\n1. The VTG team reviews the application and submitted information.\n2. If clarification or corrected information is needed, we will contact you using this email address.\n3. We will send a separate email when a decision has been made. If approved, the relevant account features will be enabled for your workspace.\n\nWHAT YOU NEED TO DO NOW\nNo further action is required unless the VTG team contacts you. Please monitor your inbox and check your spam or junk folder for future VTG messages. Keep your registered contact details accessible, and please do not submit another application while this one is pending.\n\nYour application remains received and pending review. Thank you for your interest in trading with VTG.\n\nVTG Account Administration\nVTG — The Private Trade House\nAfrica · China · The World";
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
