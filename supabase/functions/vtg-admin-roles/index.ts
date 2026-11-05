import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json"};
const send=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:h});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(!["GET","POST"].includes(req.method))return send({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const auth=req.headers.get("Authorization")??"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!url||!anon||!service||!token)return send({error:"Authentication required"},401);
 const userDb=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
 const identity=await userDb.auth.getUser(token);if(identity.error||!identity.data.user)return send({error:"Invalid session"},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const profile=await admin.from("profiles").select("role,is_active").eq("id",identity.data.user.id).maybeSingle();
 if(profile.error||profile.data?.role!=="admin"||!profile.data.is_active)return send({error:"Administrator access required"},403);
 if(req.method==="GET"){
  const result=await admin.from("role_requests").select("id,user_id,requested_role,organization_name,country,registration_reference,message,application_data,status,reviewer_id,reviewer_notes,created_at,reviewed_at,applicant:profiles!role_requests_user_id_fkey(email,full_name)").order("created_at",{ascending:false}).limit(200);
  if(result.error)return send({error:"Could not load role requests"},500);
  return send({requests:result.data??[]});
 }
 const body=await req.json().catch(()=>({}));
 if(typeof body.request_id!=="string"||!["approved","rejected"].includes(body.decision))return send({error:"Request ID and approved/rejected decision are required"},400);
 const result=await userDb.rpc("vtg_admin_review_role_request",{p_request_id:body.request_id,p_decision:body.decision,p_reviewer_id:identity.data.user.id,p_notes:typeof body.notes==="string"?body.notes:null});
 if(result.error)return send({error:result.error.message},400);
 return send({result:result.data});
});