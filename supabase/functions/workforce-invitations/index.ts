import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_SITE_URL") ?? "https://vtg-backended.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status,headers:cors});
const roles = new Set(["agent","manager","staff","logistics","compliance","support","finance","inspector","marketing"]);
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return reply({error:"Server configuration incomplete"},500);
  const bearer = req.headers.get("Authorization") ?? "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token) return reply({error:"Authentication required"},401);
  const userClient = createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
  const auth = await userClient.auth.getUser(token);
  const user = auth.data.user;
  if (auth.error || !user) return reply({error:"Invalid session"},401);
  const admin = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const profileResult = await admin.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  const profile = profileResult.data;
  const path = new URL(req.url).pathname.split("/workforce-invitations").pop() ?? "";
  const parts = path.split("/").filter(Boolean);
  const body = req.method === "GET" ? {} : await req.json().catch(()=>({}));

  if (parts[0] === "accept" && req.method === "POST") {
    if (profileResult.error || !profile || !profile.is_active) return reply({error:"Active account required"},403);
    if (typeof body.invitation_id !== "string") return reply({error:"Invitation ID required"},400);
    const accepted = await admin.rpc("vtg_accept_workforce_invitation",{
      p_invitation_id:body.invitation_id,p_user_id:user.id,p_email:user.email ?? "",p_token_hash:await (async()=>{const bytes=new TextEncoder().encode(String(body.token ?? ""));const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");})()
    });
    if (accepted.error) return reply({error:accepted.error.message},400);
    return reply({success:true,invitation:accepted.data});
  }
  if (profileResult.error || profile?.role !== "admin" || !profile.is_active)
    return reply({error:"Administrator access required"},403);

  if (req.method === "GET") {
    const result = await admin.from("vtg_workforce_invitations")
      .select("id,email,workspace_role,status,invited_by,expires_at,accepted_at,created_at")
      .order("created_at",{ascending:false}).limit(100);
    if (result.error) return reply({error:"Could not load invitations"},500);
    return reply({invitations:result.data ?? []});
  }
  if (parts[0] && req.method === "PATCH") {
    const result = await admin.from("vtg_workforce_invitations")
      .update({status:"revoked",updated_at:new Date().toISOString()})
      .eq("id",parts[0]).eq("status","pending").select("id,status").maybeSingle();
    if (result.error) return reply({error:"Could not revoke invitation"},500);
    if (!result.data) return reply({error:"Pending invitation not found"},404);
    return reply({invitation:result.data});
  }
  if (req.method === "POST") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.workspace_role === "string" ? body.workspace_role : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !roles.has(role))
      return reply({error:"A valid email and workspace role are required"},400);
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const inviteToken = btoa(String.fromCharCode(...bytes)).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(inviteToken));
    const hash = Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
    const created = await admin.from("vtg_workforce_invitations").insert({
      email,workspace_role:role,status:"pending",token_hash:hash,invited_by:user.id,
      expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString()
    }).select("id,email,workspace_role,status,expires_at").single();
    if (created.error) return reply({error:"Could not create invitation. A pending invitation may already exist."},409);
    const site = Deno.env.get("APP_SITE_URL") ?? "https://vtg-backended.vercel.app";
    const mail = await admin.auth.admin.inviteUserByEmail(email,{
      redirectTo:site+"/workforce-accept.html?invitation="+encodeURIComponent(created.data.id)+"&token="+encodeURIComponent(inviteToken),
      data:{workforce_invitation_id:created.data.id,workforce_role:role}
    });
    return reply({invitation:created.data,email_sent:!mail.error,email_note:mail.error?"Invitation recorded. Existing users can sign in with this email and accept it; configure Supabase SMTP for delivery.":undefined},201);
  }
  return reply({error:"Method not allowed"},405);
});