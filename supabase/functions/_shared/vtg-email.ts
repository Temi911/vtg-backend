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
};

export async function sendVtgEmail(input: VtgEmailInput) {
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
