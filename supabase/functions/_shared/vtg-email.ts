import { renderVtgEmail, type RichContent } from "./vtg-email-template.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] ?? char));

export type VtgEmailInput = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  idempotencyKey?: string;
  highlight?: { label: string; value: string };
  rich?: RichContent;
};

export async function sendVtgEmail(input: VtgEmailInput) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("VTG_EMAIL_FROM");
  const appUrl = (Deno.env.get("VTG_APP_URL") || "https://vtg-staging.vercel.app").replace(/\/$/, "");
  if (!apiKey || !from) throw new Error("VTG email service is not configured. Set RESEND_API_KEY and VTG_EMAIL_FROM.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) throw new Error("A valid recipient email is required.");

  const html = renderVtgEmail({ heading: input.heading, body: input.body, rich: input.rich, highlight: input.highlight, ctaLabel: input.ctaLabel, ctaUrl: input.ctaUrl, appUrl });
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
      text: `${input.heading}\n\n${input.body}${input.highlight?.value ? `\n\n${input.highlight.label}: ${input.highlight.value}` : ""}\n\nSign in to your VTG workspace: ${appUrl}`,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : `Resend returned HTTP ${response.status}`);
  return { id: typeof result?.id === "string" ? result.id : null };
}

export async function deliverTrackedEmail(
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
