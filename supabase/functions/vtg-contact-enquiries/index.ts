import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const clean = (v: unknown, max = 500) => typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
const escapeHtml = (v: string) => v.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c] ?? c);
const makeReference = () => "VTG-C" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
const categories = new Set(["Trade Support","Marketplace Support","Logistics & Shipping","Finance & Payments","Supplier Support","Complaints & Resolution"]);

async function getAdmin(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearer = req.headers.get("Authorization") ?? "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!url || !anon || !service || !token) throw new Error("ADMIN_AUTH_REQUIRED");
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const identity = await auth.auth.getUser(token);
  if (identity.error || !identity.data.user) throw new Error("ADMIN_AUTH_REQUIRED");
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db.from("profiles").select("role,is_active,account_environment").eq("id", identity.data.user.id).maybeSingle();
  if (profile.error || profile.data?.role !== "admin" || profile.data?.is_active !== true || profile.data?.account_environment !== "staff") throw new Error("ADMIN_FORBIDDEN");
  return db;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const routePath = parts.slice(parts.indexOf("vtg-contact-enquiries") + 1).join("/");

  if (req.method === "GET" && routePath === "admin") {
    try {
      const db = await getAdmin(req);
      const result = await db.from("vtg_contact_enquiries")
        .select("id,reference,category,topic,contact_type,full_name,email,country,phone,company,enquiry_reference,subject,message,status,email_status,created_at,updated_at")
        .order("created_at", { ascending: false }).limit(100);
      if (result.error) return reply({ error: "Could not load the contact enquiry inbox." }, 500);
      return reply({ enquiries: result.data ?? [] });
    } catch (error) {
      const forbidden = (error as Error)?.message === "ADMIN_FORBIDDEN";
      return reply({ error: forbidden ? "Active VTG staff administrator access is required." : "Administrator authentication is required." }, forbidden ? 403 : 401);
    }
  }

  if (req.method === "PATCH" && routePath.startsWith("admin/")) {
    try {
      const db = await getAdmin(req);
      const id = routePath.slice("admin/".length);
      const body = await req.json().catch(() => ({}));
      const status = clean(body.status, 20);
      if (!id || !["open","in_review","resolved","closed"].includes(status)) return reply({ error: "A valid enquiry ID and status are required." }, 400);
      const result = await db.from("vtg_contact_enquiries").update({ status, updated_at: new Date().toISOString() })
        .eq("id", id).select("id,reference,status,updated_at").maybeSingle();
      if (result.error || !result.data) return reply({ error: "Enquiry not found or could not be updated." }, 404);
      return reply({ enquiry: result.data });
    } catch (error) {
      const forbidden = (error as Error)?.message === "ADMIN_FORBIDDEN";
      return reply({ error: forbidden ? "Active VTG staff administrator access is required." : "Administrator authentication is required." }, forbidden ? 403 : 401);
    }
  }

  if (req.method !== "POST" || routePath !== "") return reply({ error: "Method not allowed." }, 405);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "A valid enquiry is required." }, 400);
  if (clean((body as Record<string, unknown>).website, 200)) return reply({ ok: true, reference: null, message: "Your enquiry has been received." }, 201);

  const b = body as Record<string, unknown>;
  const category = clean(b.category, 80), topic = clean(b.topic, 120), contactType = clean(b.contactType, 40);
  const fullName = clean(b.name, 140), email = clean(b.email, 254).toLowerCase();
  const country = clean(b.country, 100), callingCode = clean(b.callingCode, 8), phone = clean(b.phone, 40);
  const company = clean(b.company, 180), enquiryReference = clean(b.reference, 120);
  const subject = clean(b.subject, 180), message = typeof b.message === "string" ? b.message.trim().slice(0, 4000) : "";
  if (!categories.has(category) || !topic || !["Individual","Company / Organization"].includes(contactType) ||
      fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !country ||
      !/^\+\d{1,4}$/.test(callingCode) || phone.length < 5 || subject.length < 3 || message.length < 10 || b.consent !== true) {
    return reply({ error: "Please complete the required fields and confirm consent before submitting." }, 400);
  }
  if (/(password|verification code|one.time code|otp\s*[:=])/i.test(message)) {
    return reply({ error: "For your security, do not include passwords or verification codes in an enquiry." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return reply({ error: "The VTG enquiry service is temporarily unavailable. Please email vintageafricatrade@gmail.com." }, 503);
  const forwarded = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(forwarded))
    .then(hash => Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join(""));
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const recent = await db.from("vtg_contact_enquiries").select("id", { count: "exact", head: true })
    .eq("source_ip_hash", ipHash).gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (recent.error) return reply({ error: "We could not verify the enquiry submission right now. Please try again shortly." }, 503);
  if ((recent.count ?? 0) >= 3) return reply({ error: "Too many enquiries have been submitted from this connection. Please try again later." }, 429);

  const ref = makeReference();
  const inserted = await db.from("vtg_contact_enquiries").insert({
    reference: ref, category, topic, contact_type: contactType, full_name: fullName, email,
    country, calling_code: callingCode, phone, company: company || null,
    enquiry_reference: enquiryReference || null, subject, message, source_ip_hash: ipHash,
    user_agent: clean(req.headers.get("user-agent"), 500) || null,
  }).select("id").single();
  if (inserted.error || !inserted.data) {
    console.error("VTG contact enquiry storage failed", inserted.error?.message);
    return reply({ error: "VTG could not save your enquiry. Please try again or email vintageafricatrade@gmail.com." }, 500);
  }

  const to = Deno.env.get("CONTACT_TEAM_EMAIL") || "vintageafricatrade@gmail.com";
  const from = Deno.env.get("VTG_EMAIL_FROM"), resendKey = Deno.env.get("RESEND_API_KEY");
  let emailStatus = "not_configured", emailError: string | null = null;
  if (from && resendKey) {
    const text = ["VTG CONTACT ENQUIRY","Reference: " + ref,"","Team: " + category,"Topic: " + topic,
      "Contact type: " + contactType,"Name: " + fullName,"Email: " + email,"Country: " + country,
      "Phone: " + callingCode + " " + phone,"Company: " + (company || "Not provided"),
      "Reference supplied: " + (enquiryReference || "Not provided"),"Subject: " + subject,"",message].join("\n");
    const html = "<!doctype html><html><body><h2>VTG Contact Enquiry</h2><p><b>Reference:</b> " + escapeHtml(ref) +
      "</p><p><b>Team:</b> " + escapeHtml(category) + "</p><p><b>Topic:</b> " + escapeHtml(topic) +
      "</p><p><b>Contact:</b> " + escapeHtml(fullName) + " (" + escapeHtml(email) + ")</p><p><b>Phone:</b> " +
      escapeHtml(callingCode + " " + phone) + "</p><p><b>Country:</b> " + escapeHtml(country) +
      "</p><p><b>Company:</b> " + escapeHtml(company || "Not provided") + "</p><p><b>Reference supplied:</b> " +
      escapeHtml(enquiryReference || "Not provided") + "</p><p><b>Subject:</b> " + escapeHtml(subject) +
      "</p><p>" + escapeHtml(message).replace(/\n/g, "<br>") + "</p></body></html>";
    try {
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json", "Idempotency-Key": "vtg-contact-" + ref },
        body: JSON.stringify({ from, to: [to], reply_to: email, subject: "VTG Enquiry | " + category + " | " + ref, text, html }),
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
  await db.from("vtg_contact_enquiries").update({ email_status: emailStatus, email_error: emailError }).eq("id", inserted.data.id);
  return reply({ ok: true, reference: ref, emailStatus,
    message: emailStatus === "sent"
      ? "Your enquiry has been securely recorded and the relevant VTG team has been notified."
      : "Your enquiry has been securely recorded. Automatic email notification is not configured or could not be delivered; you can also contact vintageafricatrade@gmail.com.",
  }, 201);
});
