import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const text=(v:unknown):v is string=>typeof v==="string";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(!["GET","POST","PATCH"].includes(req.method))return reply({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
 const bearer=req.headers.get("Authorization")??"",token=bearer.startsWith("Bearer ")?bearer.slice(7):"";
 if(!url||!key||!token)return reply({error:"Authentication required"},401);
 const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
 const identity=await db.auth.getUser(token);if(identity.error||!identity.data.user)return reply({error:"Invalid session"},401);
 const user=identity.data.user, u=new URL(req.url);
 const path=u.pathname.split("/vtg-trade-operations").pop()??"";
 const seg=path.split("/").filter(Boolean);
 const body=req.method==="GET"?{}:await req.json().catch(()=>({}));

 if(seg[0]==="quotes"){
  if(req.method==="GET"){
   const result=await db.from("trade_quotes").select("id,order_id,buyer_id,supplier_id,product_id,quantity,unit_price,currency,incoterm,delivery_days,status,buyer_message,supplier_message,valid_until,created_at,updated_at").order("created_at",{ascending:false}).limit(100);
   if(result.error)return reply({error:"Could not load quotes"},403);
   return reply({quotes:result.data??[]});
  }
  if(seg[1]&&req.method==="PATCH"){
   const allowed=["quoted","declined"];
   if(!allowed.includes(body.status)|| (body.status==="quoted" && (!Number.isFinite(Number(body.unit_price))||Number(body.unit_price)<0)))return reply({error:"Provide a valid quote response"},400);
   const update={status:body.status,unit_price:body.status==="quoted"?Number(body.unit_price):null,currency:["USD","NGN","CNY","KRW"].includes(body.currency)?body.currency:"USD",incoterm:text(body.incoterm)?body.incoterm:null,delivery_days:Number.isInteger(body.delivery_days)&&body.delivery_days>=0?body.delivery_days:null,supplier_message:text(body.supplier_message)?body.supplier_message.slice(0,4000):null,valid_until:text(body.valid_until)?body.valid_until:null,updated_at:new Date().toISOString()};
   const result=await db.from("trade_quotes").update(update).eq("id",seg[1]).eq("status","requested").select().maybeSingle();
   if(result.error)return reply({error:"Could not respond to quote"},403);
   if(!result.data)return reply({error:"Quote not found or no longer awaiting response"},404);
   return reply({quote:result.data});
  }
  if(req.method==="POST"){
   if(!text(body.order_id)||!Number.isFinite(Number(body.quantity))||Number(body.quantity)<=0)return reply({error:"Order and positive quantity are required"},400);
   const order=await db.from("trade_orders").select("id,buyer_id,supplier_id,product_id,currency").eq("id",body.order_id).eq("buyer_id",user.id).maybeSingle();
   if(order.error||!order.data)return reply({error:"Only the buyer on an existing order can request its quote"},403);
   const result=await db.from("trade_quotes").insert({order_id:order.data.id,buyer_id:user.id,supplier_id:order.data.supplier_id,product_id:order.data.product_id,quantity:Number(body.quantity),currency:order.data.currency,buyer_message:text(body.buyer_message)?body.buyer_message.slice(0,4000):null,incoterm:text(body.incoterm)?body.incoterm:null}).select().single();
   if(result.error)return reply({error:"Quote request could not be created"},403);
   return reply({quote:result.data},201);
  }
 }
 if(seg[0]==="shipments"&&seg[1]&&seg[2]==="events"){
  if(req.method==="GET"){
   const result=await db.from("shipment_events").select("id,shipment_id,event_type,description,location,event_time,created_by,created_at").eq("shipment_id",seg[1]).order("event_time",{ascending:false}).limit(200);
   if(result.error)return reply({error:"Could not load shipment events"},403);
   return reply({events:result.data??[]});
  }
  if(req.method==="POST"){
   if(!text(body.event_type)||!text(body.description)||!body.description.trim())return reply({error:"Event type and description are required"},400);
   const result=await db.from("shipment_events").insert({shipment_id:seg[1],event_type:body.event_type.slice(0,80),description:body.description.slice(0,2000),location:text(body.location)?body.location.slice(0,240):null,event_time:text(body.event_time)?body.event_time:new Date().toISOString(),created_by:user.id}).select().single();
   if(result.error)return reply({error:"Event could not be recorded. Only the shipment supplier or an administrator may add events."},403);
   return reply({event:result.data},201);
  }
 }
 return reply({error:"Route not found",available:["GET|POST /quotes","PATCH /quotes/:id","GET|POST /shipments/:id/events"]},404);
});