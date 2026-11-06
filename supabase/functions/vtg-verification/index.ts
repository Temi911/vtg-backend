import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { deliverTrackedEmail } from "../_shared/vtg-email.ts";

const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: H });
const str = (v: unknown) => typeof v === "string" ? v.trim() : "";

const docTypes: Record<string, string[]> = {
  supplier: ["company_registration", "business_license", "tax_certificate", "export_license", "company_address_proof", "other"],
  bank: ["bank_license", "regulatory_certificate", "company_registration", "swift_bic_certificate", "institution_address_proof", "officer_authorization", "other"],
  agent: ["government_id", "proof_of_address", "business_registration", "professional_certificate", "reference_document", "other"],
};
const requiredTypes: Record<string, string[]> = {
  supplier: ["company_registration", "business_license", "tax_certificate", "company_address_proof"],
  bank: ["bank_license", "regulatory_certificate", "company_registration", "swift_bic_certificate", "institution_address_proof", "officer_authorization"],
  agent: ["government_id", "proof_of_address", "professional_certificate"],
};
const profileTable: Record<string, string> = {
  supplier: "supplier_profiles",
  bank: "bank_profiles",
  agent: "agent_profiles",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (!["GET", "POST", "PATCH"].includes(req.method)) return out({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!url || !anon || !service || !token) return out({ error: "Authentication required" }, 401);

  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const who = await auth.auth.getUser(token);
  if (who.error || !who.data.user) return out({ error: "Invalid session" }, 401);

  const user = who.data.user;
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (profile.error || !profile.data?.is_active) return out({ error: "Active profile required" }, 403);

  const workforceAgent = await db.from("vtg_workforce_members")
    .select("workspace_role").eq("user_id", user.id).eq("workspace_role", "agent").eq("status", "active").maybeSingle();
  const admin = profile.data.role === "admin";
  let role = workforceAgent.data ? "agent" : profile.data.role;
  let applicationStatus: string | null = null;

  if (profile.data.role === "buyer") {
    const application = await db.from("role_requests")
      .select("requested_role,status").eq("user_id", user.id)
      .in("requested_role", ["supplier", "bank", "agent"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (application.data) {
      role = application.data.requested_role;
      applicationStatus = application.data.status;
    }
  }

  const u = new URL(req.url);
  const parts = u.pathname.split("/vtg-verification").pop()?.split("/").filter(Boolean) ?? [];
  const action = parts.join("/");
  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

  const getProfileDetails = async () => {
    if (!profileTable[role]) return { verificationStatus: "pending", logoUrl: null };
    const q = await db.from(profileTable[role]).select("verification_status,verified_at,logo_url").eq("user_id", user.id).maybeSingle();
    return { verificationStatus: q.data?.verification_status ?? "pending", logoUrl: q.data?.logo_url ?? null };
  };
  const getStatus = async () => (await getProfileDetails()).verificationStatus;
  const setStatus = async (accountRole: string, status: string) => {
    const table = profileTable[accountRole];
    if (!table) return;
    await db.from(table).update({
      verification_status: status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    }).eq("user_id", user.id);
  };

  if (action === "documents" && req.method === "GET") {
    if (!["supplier", "bank", "agent"].includes(role)) return out({ error: "Business applicant account required" }, 403);
    const q = await db.from("vtg_verification_documents")
      .select("id,account_role,doc_type,file_name,mime_type,file_size_bytes,status,review_notes,uploaded_at,reviewed_at,expires_at,reviewer:profiles!vtg_verification_documents_reviewer_id_fkey(full_name)")
      .eq("user_id", user.id).order("uploaded_at", { ascending: false });
    if (q.error) return out({ error: "Could not load documents" }, 500);
    const details = await getProfileDetails();
    return out({
      documents: q.data ?? [],
      verificationStatus: details.verificationStatus,
      logoUrl: details.logoUrl,
      logoUploaded: Boolean(details.logoUrl),
      applicationStatus,
      applicationPending: applicationStatus === "pending",
      canUpload: profile.data.role === role && applicationStatus !== "rejected",
    });
  }

  if (action === "upload-url" && req.method === "POST") {
    if (!["supplier", "bank", "agent"].includes(role) || profile.data.role !== role)
      return out({ error: "Your business application must be approved before uploading verification documents." }, 403);
    const kind = str(body.docType), name = str(body.fileName), mime = str(body.mimeType), size = Number(body.fileSize);
    if (!(docTypes[role] ?? []).includes(kind) || !name || name.length > 180 ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mime) ||
      !Number.isInteger(size) || size < 1 || size > 52428800)
      return out({ error: "Invalid document type or file details" }, 400);
    const path = user.id + "/" + crypto.randomUUID() + "-" + name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const signed = await db.storage.from("vtg-verification-documents").createSignedUploadUrl(path);
    if (signed.error) return out({ error: "Could not create secure upload URL" }, 500);
    return out({ uploadUrl: signed.data.signedUrl, token: signed.data.token, path, docType: kind, fileName: name, mimeType: mime, fileSizeBytes: size }, 201);
  }

  if (action === "documents" && req.method === "POST") {
    if (!["supplier", "bank", "agent"].includes(role) || profile.data.role !== role)
      return out({ error: "Your business application must be approved before uploading verification documents." }, 403);
    const path = str(body.path), kind = str(body.docType), name = str(body.fileName), mime = str(body.mimeType), size = Number(body.fileSizeBytes);
    if (!path.startsWith(user.id + "/") || !(docTypes[role] ?? []).includes(kind) || !name ||
      !Number.isInteger(size) || size < 1 || size > 52428800)
      return out({ error: "Invalid document metadata" }, 400);
    const objectName = path.split("/").pop() ?? "";
    const object = await db.storage.from("vtg-verification-documents").list(user.id, { search: objectName });
    if (object.error || !object.data?.some(x => x.name === objectName)) return out({ error: "Uploaded file not found" }, 422);
    const q = await db.from("vtg_verification_documents").insert({
      user_id: user.id, account_role: role, doc_type: kind, file_name: name,
      storage_path: path, mime_type: mime, file_size_bytes: size,
    }).select("id,doc_type,file_name,status,uploaded_at").single();
    if (q.error) return out({ error: "Could not register verification document" }, 400);
    await setStatus(role, "pending");
    return out({ document: q.data }, 201);
  }

  if (action === "logo-upload-url" && req.method === "POST") {
    if (!["supplier", "bank", "agent"].includes(role) || profile.data.role !== role)
      return out({ error: "Your business application must be approved before uploading a logo." }, 403);
    const name = str(body.fileName), mime = str(body.mimeType), size = Number(body.fileSize);
    if (!name || name.length > 160 || !["image/jpeg", "image/png", "image/webp"].includes(mime) ||
      !Number.isInteger(size) || size < 1 || size > 5242880)
      return out({ error: "Choose a JPG, PNG or WebP logo no larger than 5 MB." }, 400);
    const path = user.id + "/" + crypto.randomUUID() + "-" + name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const signed = await db.storage.from("vtg-company-logos").createSignedUploadUrl(path);
    if (signed.error) return out({ error: "Could not create secure logo upload URL" }, 500);
    return out({ token: signed.data.token, path, fileName: name }, 201);
  }

  if (action === "logo" && req.method === "POST") {
    if (!["supplier", "bank", "agent"].includes(role) || profile.data.role !== role)
      return out({ error: "Your business application must be approved before uploading a logo." }, 403);
    const path = str(body.path);
    if (!path.startsWith(user.id + "/")) return out({ error: "Invalid logo path" }, 400);
    const objectName = path.split("/").pop() ?? "";
    const object = await db.storage.from("vtg-company-logos").list(user.id, { search: objectName });
    if (object.error || !object.data?.some(x => x.name === objectName)) return out({ error: "Uploaded logo not found" }, 422);
    const publicUrl = db.storage.from("vtg-company-logos").getPublicUrl(path).data.publicUrl;
    const table = profileTable[role];
    const saved = await db.from(table).update({ logo_url: publicUrl }).eq("user_id", user.id);
    if (saved.error) return out({ error: "Could not save company logo" }, 500);
    return out({ logoUrl: publicUrl });
  }

  if (action === "review-queue" && req.method === "GET") {
    if (!admin) return out({ error: "Administrator required" }, 403);
    const q = await db.from("vtg_verification_documents")
      .select("id,user_id,account_role,doc_type,file_name,mime_type,file_size_bytes,status,uploaded_at,applicant:profiles!vtg_verification_documents_user_id_fkey(email,full_name)")
      .eq("status", "pending").order("uploaded_at");
    return q.error ? out({ error: "Review queue unavailable" }, 500) : out({ documents: q.data ?? [] });
  }

  if (parts[0] === "documents" && parts[1] && parts[2] === "download" && req.method === "GET") {
    const q = await db.from("vtg_verification_documents").select("user_id,storage_path").eq("id", parts[1]).maybeSingle();
    if (!q.data || (!admin && q.data.user_id !== user.id)) return out({ error: "Document not found" }, 404);
    const signed = await db.storage.from("vtg-verification-documents").createSignedUrl(q.data.storage_path, 90);
    return signed.error ? out({ error: "Could not create private download link" }, 500) : out({ url: signed.data.signedUrl, expiresIn: 90 });
  }

  if (parts[0] === "documents" && parts[1] && parts[2] === "review" && req.method === "PATCH") {
    if (!admin) return out({ error: "Administrator required" }, 403);
    const status = str(body.status), notes = str(body.notes), expires = str(body.expiresAt);
    if (!["verified", "rejected"].includes(status) || (status === "rejected" && !notes) ||
      (expires && (status !== "verified" || !Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= Date.now())))
      return out({ error: "Invalid review decision; rejection requires notes and expiry must be future" }, 400);
    const q = await db.from("vtg_verification_documents")
      .update({ status, review_notes: notes || null, reviewer_id: user.id, reviewed_at: new Date().toISOString(), expires_at: status === "verified" && expires ? expires : null })
      .eq("id", parts[1]).eq("status", "pending")
      .select("id,user_id,account_role,doc_type,status,review_notes,reviewed_at,expires_at").maybeSingle();
    if (q.error || !q.data) return out({ error: "Document not found, already reviewed, or review failed" }, 409);

    const all = await db.from("vtg_verification_documents")
      .select("doc_type,status,uploaded_at").eq("user_id", q.data.user_id).eq("account_role", q.data.account_role)
      .order("uploaded_at", { ascending: false });
    if (all.error) return out({ error: "Document reviewed, but verification status could not be refreshed" }, 500);
    const latest = new Map<string, string>();
    for (const item of all.data ?? []) if (!latest.has(item.doc_type)) latest.set(item.doc_type, item.status);
    const required = requiredTypes[q.data.account_role] ?? [];
    const rejected = required.some(kind => latest.get(kind) === "rejected");
    const complete = required.length > 0 && required.every(kind => latest.get(kind) === "verified");
    const nextStatus = rejected ? "rejected" : complete ? "verified" : "under_review";
    const table = profileTable[q.data.account_role];
    if (table) {
      const update = await db.from(table).update({
        verification_status: nextStatus,
        verified_at: nextStatus === "verified" ? new Date().toISOString() : null,
      }).eq("user_id", q.data.user_id);
      if (update.error) return out({ error: "Document reviewed, but profile verification status could not be updated" }, 500);
    }

    // Notify the applicant after the review is saved. Email is best-effort and
    // never reverses a completed verification decision.
    let email: Record<string, unknown> = { sent: false, status: "not_attempted" };
    try {
      const recipient = await db.from("profiles").select("email")
        .eq("id", q.data.user_id).maybeSingle();
      if (recipient.error || !recipient.data?.email) {
        throw new Error("Review saved, but applicant email is unavailable.");
      }
      const delivery = await deliverTrackedEmail(db, {
        userId: q.data.user_id,
        to: recipient.data.email,
        eventType: "company_verification_update",
        eventKey: "company-verification-document-review:" + q.data.id,
        idempotencyKey: "vtg-company-verification-" + q.data.id,
        subject: "A VTG company verification update is available",
        heading: "Company verification update",
        body: "VTG has reviewed a document submitted for your company verification. The document status is " +
          q.data.status + " and your overall verification status is " + nextStatus +
          ". Sign in to your VTG workspace to review any notes and next steps.",
        ctaLabel: "Review verification",
        ctaUrl: (Deno.env.get("VTG_APP_URL") || "https://vtg-staging.vercel.app") + "/",
      });
      email = { ...delivery, status: delivery.sent ? "sent" : "not_sent" };
    } catch (error) {
      email = { sent: false, status: "failed", error: String((error as Error)?.message || error).slice(0, 300) };
    }
    return out({ document: q.data, verificationStatus: nextStatus, email });
  }

  return out({ error: "Route not found" }, 404);
});
