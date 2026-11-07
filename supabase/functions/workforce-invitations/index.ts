import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedRoles = new Set([
  "agent", "manager", "staff", "logistics", "compliance",
  "support", "finance", "inspector", "marketing",
]);
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_SITE_URL") ?? "https://vtg-backended.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map((b) => b.toString(16).padStart(2, "0")).join("");
const audit = async (admin: ReturnType<typeof createClient>, actorId: string, eventType: string,
  entityType: string, entityId: string, details: Record<string, unknown>) => {
  const result = await admin.from("audit_events").insert({
    actor_id: actorId, event_type: eventType, entity_type: entityType,
    entity_id: entityId, details,
  });
  if (result.error) console.error("Workforce audit write failed:", result.error.message);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!["GET", "POST", "PATCH"].includes(req.method)) return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishable || !serviceKey) return reply({ error: "Server configuration incomplete" }, 500);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return reply({ error: "Authentication required" }, 401);

  const userClient = createClient(url, publishable, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const identity = await userClient.auth.getUser(token);
  const caller = identity.data.user;
  if (identity.error || !caller) return reply({ error: "Invalid session" }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const profileResult = await admin.from("profiles")
    .select("id,email,full_name,role,is_active,account_environment")
    .eq("id", caller.id).maybeSingle();
  if (profileResult.error || !profileResult.data) return reply({ error: "Account profile unavailable" }, 403);
  const profile = profileResult.data;

  const path = new URL(req.url).pathname.split("/workforce-invitations").pop() ?? "";
  const parts = path.split("/").filter(Boolean);
  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

  // Invite acceptance is the only non-admin write path. The signed-in identity,
  // email, staff environment, invitation ID and one-time token are all checked.
  if (parts[0] === "accept" && req.method === "POST") {
    if (profile.account_environment !== "staff" || !profile.is_active) {
      return reply({ error: "An active invited staff account is required" }, 403);
    }
    if (typeof body.invitation_id !== "string" || typeof body.token !== "string") {
      return reply({ error: "Invitation ID and invitation token are required" }, 400);
    }
    const accepted = await admin.rpc("vtg_accept_workforce_invitation", {
      p_invitation_id: body.invitation_id,
      p_user_id: caller.id,
      p_email: caller.email ?? "",
      p_token_hash: await hashToken(body.token),
    });
    if (accepted.error) return reply({ error: accepted.error.message }, 400);
    await audit(admin, caller.id, "workforce_invitation_accepted", "workforce_invitation",
      body.invitation_id, { workspace_role: accepted.data?.workspace_role });
    return reply({ success: true, invitation: accepted.data });
  }

  // A signed-in staff user may inspect only their own active workspace memberships.
  if (parts[0] === "me" && req.method === "GET") {
    if (profile.account_environment !== "staff" || !profile.is_active) {
      return reply({ error: "Staff account required" }, 403);
    }
    const result = await admin.from("vtg_workforce_members")
      .select("id,workspace_role,status,created_at")
      .eq("user_id", caller.id).eq("status", "active")
      .order("created_at", { ascending: true });
    if (result.error) return reply({ error: "Could not verify staff workspace access" }, 500);
    return reply({ memberships: result.data ?? [] });
  }

  if (profile.role !== "admin" || !profile.is_active || profile.account_environment !== "staff") {
    return reply({ error: "Administrator access required" }, 403);
  }

  if (req.method === "GET" && parts[0] === "members") {
    const memberships = await admin.from("vtg_workforce_members")
      .select("id,user_id,workspace_role,status,invited_by,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(300);
    if (memberships.error) return reply({ error: "Could not load staff accounts" }, 500);
    const ids = [...new Set((memberships.data ?? []).map((item) => item.user_id))];
    const profiles = ids.length
      ? await admin.from("profiles").select("id,email,full_name,is_active,account_environment").in("id", ids)
      : { data: [], error: null };
    if (profiles.error) return reply({ error: "Could not load staff identity details" }, 500);
    const byId = new Map((profiles.data ?? []).map((item) => [item.id, item]));
    const rows = (memberships.data ?? [])
      .filter((item) => byId.get(item.user_id)?.account_environment === "staff")
      .map((item) => ({ ...item, profile: byId.get(item.user_id) }));
    return reply({ members: rows });
  }

  if (req.method === "GET") {
    const result = await admin.from("vtg_workforce_invitations")
      .select("id,email,workspace_role,status,invited_by,expires_at,accepted_at,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (result.error) return reply({ error: "Could not load invitations" }, 500);
    return reply({ invitations: result.data ?? [] });
  }

  if (req.method === "PATCH" && parts[0] === "members" && parts.length >= 3) {
    const userId = parts[1];
    const workspaceRole = parts[2];
    const status = body.status;
    if (!allowedRoles.has(workspaceRole) || !["active", "suspended", "removed"].includes(status)) {
      return reply({ error: "A valid staff role and status are required" }, 400);
    }
    const target = await admin.from("profiles")
      .select("id,account_environment,role").eq("id", userId).maybeSingle();
    if (target.error || target.data?.account_environment !== "staff") {
      return reply({ error: "Staff account not found" }, 404);
    }
    const changed = await admin.from("vtg_workforce_members")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("workspace_role", workspaceRole)
      .select("id,user_id,workspace_role,status").maybeSingle();
    if (changed.error) return reply({ error: "Could not update staff access" }, 500);
    if (!changed.data) return reply({ error: "Staff workspace assignment not found" }, 404);

    const active = await admin.from("vtg_workforce_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "active");
    if (active.error) return reply({ error: "Could not verify remaining staff access" }, 500);
    const isActive = (active.count ?? 0) > 0;
    const profileUpdate = await admin.from("profiles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (profileUpdate.error) return reply({ error: "Access changed but profile status could not be synchronized" }, 500);
    await audit(admin, caller.id, "workforce_access_" + status, "workforce_member", changed.data.id,
      { user_id: userId, workspace_role: workspaceRole, account_active: isActive });
    return reply({ member: changed.data, account_active: isActive });
  }

  if (req.method === "PATCH" && parts.length === 1) {
    const result = await admin.from("vtg_workforce_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", parts[0]).eq("status", "pending")
      .select("id,status").maybeSingle();
    if (result.error) return reply({ error: "Could not revoke invitation" }, 500);
    if (!result.data) return reply({ error: "Pending invitation not found" }, 404);
    await audit(admin, caller.id, "workforce_invitation_revoked", "workforce_invitation",
      result.data.id, { status: result.data.status });
    return reply({ invitation: result.data });
  }

  if (req.method === "POST" && parts[0] === "resend" && parts[1]) {
    const existing = await admin.from("vtg_workforce_invitations")
      .select("id,email,workspace_role,status,expires_at,token_hash")
      .eq("id", parts[1]).maybeSingle();
    if (existing.error || !existing.data || existing.data.status !== "pending" ||
        new Date(existing.data.expires_at).getTime() <= Date.now()) {
      return reply({ error: "A valid pending invitation was not found" }, 404);
    }
    const tokenValue = newToken();
    const tokenHash = await hashToken(tokenValue);
    const changed = await admin.from("vtg_workforce_invitations")
      .update({ token_hash: tokenHash, updated_at: new Date().toISOString() })
      .eq("id", existing.data.id);
    if (changed.error) return reply({ error: "Could not prepare a new invitation link" }, 500);
    const site = Deno.env.get("APP_SITE_URL") ?? "https://vtg-backended.vercel.app";
    const sent = await admin.auth.admin.inviteUserByEmail(existing.data.email, {
      redirectTo: site + "/workforce-accept.html?invitation=" +
        encodeURIComponent(existing.data.id) + "&token=" + encodeURIComponent(tokenValue),
      data: {
        workforce_invitation_id: existing.data.id,
        workforce_role: existing.data.workspace_role,
      },
    });
    if (sent.error) {
      await admin.from("vtg_workforce_invitations")
        .update({ token_hash: existing.data.token_hash, updated_at: new Date().toISOString() })
        .eq("id", existing.data.id);
      return reply({ error: "Supabase could not resend this invitation. Check the Invite user email template and SMTP settings." }, 502);
    }
    await audit(admin, caller.id, "workforce_invitation_resent", "workforce_invitation",
      existing.data.id, { email: existing.data.email, workspace_role: existing.data.workspace_role });
    return reply({ invitation: { id: existing.data.id, status: "pending" }, email_sent: true });
  }

  if (req.method === "POST" && parts.length === 0) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const workspaceRole = typeof body.workspace_role === "string" ? body.workspace_role : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 120) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowedRoles.has(workspaceRole)) {
      return reply({ error: "A valid email and internal workspace role are required" }, 400);
    }
    const existingProfile = await admin.from("profiles").select("id,account_environment")
      .eq("email", email).maybeSingle();
    if (existingProfile.error) return reply({ error: "Could not check existing account status" }, 500);
    if (existingProfile.data) {
      if (existingProfile.data.account_environment !== "staff" || existingProfile.data.id === caller.id ||
          existingProfile.data.role === "admin") {
        return reply({ error: "Public trade accounts cannot be converted into staff accounts, and administrator identities cannot be assigned operational roles." }, 409);
      }
      const assigned = await admin.from("vtg_workforce_members").upsert({
        user_id: existingProfile.data.id,
        workspace_role: workspaceRole,
        status: "active",
        invited_by: caller.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,workspace_role" })
        .select("id,user_id,workspace_role,status").single();
      if (assigned.error) return reply({ error: "Could not assign the workspace to this staff identity" }, 500);
      const activated = await admin.from("profiles")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", existingProfile.data.id);
      if (activated.error) return reply({ error: "Workspace assigned but account activation could not be synchronized" }, 500);
      await audit(admin, caller.id, "workforce_role_assigned", "workforce_member", assigned.data.id,
        { user_id: existingProfile.data.id, workspace_role: workspaceRole });
      return reply({ member: assigned.data, assignment_added: true, email_sent: false }, 201);
    }
    const pending = await admin.from("vtg_workforce_invitations").select("id")
      .eq("email", email).eq("status", "pending").maybeSingle();
    if (pending.error) return reply({ error: "Could not check pending invitations" }, 500);
    if (pending.data) return reply({ error: "A pending invitation already exists for this email. Resend or revoke it first." }, 409);

    const inviteToken = newToken();
    const created = await admin.from("vtg_workforce_invitations").insert({
      email, workspace_role: workspaceRole, status: "pending",
      token_hash: await hashToken(inviteToken), invited_by: caller.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id,email,workspace_role,status,expires_at").single();
    if (created.error) return reply({ error: "Could not create the invitation" }, 409);

    const site = Deno.env.get("APP_SITE_URL") ?? "https://vtg-backended.vercel.app";
    const invited = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: site + "/workforce-accept.html?invitation=" +
        encodeURIComponent(created.data.id) + "&token=" + encodeURIComponent(inviteToken),
      data: {
        full_name: fullName,
        workforce_invitation_id: created.data.id,
        workforce_role: workspaceRole,
      },
    });
    await audit(admin, caller.id, "workforce_invitation_created", "workforce_invitation",
      created.data.id, { email, workspace_role: workspaceRole });
    return reply({
      invitation: created.data,
      email_sent: !invited.error,
      email_note: invited.error
        ? "The invitation is saved, but Supabase did not send the email. Check the Invite user template and SMTP settings, then use Resend."
        : undefined,
    }, 201);
  }

  return reply({ error: "Route not found" }, 404);
});
