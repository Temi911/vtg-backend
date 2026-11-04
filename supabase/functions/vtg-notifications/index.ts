import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"GET, PATCH, OPTIONS","Content-Type":"application/json"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(!["GET","PATCH"].includes(req.method))return out({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
 const auth=req.headers.get("Authorization")??"";
 const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!url||!key||!token)return out({error:"Authentication required"},401);
 const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
 const who=await db.auth.getUser(token);if(who.error||!who.data.user)return out({error:"Invalid session"},401);
 const user=who.data.user;
 if(req.method==="GET"){
  const limit=Math.min(100,Math.max(1,Number(new URL(req.url).searchParams.get("limit"))||50));
  const result=await db.from("vtg_notifications").select("id,title,body,notification_type,entity_type,entity_id,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(limit);
  if(result.error)return out({error:"Could not load notifications"},500);
  return out({notifications:result.data??[],unread_count:(result.data??[]).filter(x=>!x.read_at).length});
 }
 const body=await req.json().catch(()=>({}));
 if(typeof body.id!=="string")return out({error:"Notification ID required"},400);
 const update=await db.from("vtg_notifications").update({read_at:new Date().toISOString()}).eq("id",body.id).eq("user_id",user.id).select("id,read_at").maybeSingle();
 if(update.error)return out({error:"Could not update notification"},500);
 if(!update.data)return out({error:"Notification not found"},404);
 return out({notification:update.data});
});