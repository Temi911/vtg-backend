import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json"};
const out=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:h});
const str=(x:unknown):x is string=>typeof x==="string";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(!["GET","POST"].includes(req.method))return out({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
 const auth=req.headers.get("Authorization")??"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!url||!key||!token)return out({error:"Authentication required"},401);
 const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
 const identity=await db.auth.getUser(token);if(identity.error||!identity.data.user)return out({error:"Invalid session"},401);
 const user=identity.data.user,u=new URL(req.url),path=u.pathname.split("/vtg-finance-inspections").pop()??"",seg=path.split("/").filter(Boolean);
 const body=req.method==="GET"?{}:await req.json().catch(()=>({}));
 if(seg[0]==="payments"&&seg[1]==="intents"){
  if(req.method==="GET"){
   const q=await db.from("vtg_payment_intents").select("id,order_id,payer_id,payee_id,amount,currency,purpose,status,provider,provider_reference,created_at,updated_at").order("created_at",{ascending:false}).limit(100);
   if(q.error)return out({error:"Could not load payment intents"},403);
   return out({payment_intents:q.data??[]});
  }
  const amount=Number(body.amount),keyValue=str(body.idempotency_key)?body.idempotency_key.trim():"";
  if(!str(body.order_id)||!Number.isFinite(amount)||amount<=0||amount>100000000000||!keyValue||keyValue.length>120||!["USD","NGN","CNY","KRW"].includes(body.currency)||!["order_deposit","order_balance","inspection","logistics","other"].includes(body.purpose))
   return out({error:"Order, positive amount, supported currency, purpose and idempotency key are required"},400);
  const order=await db.from("trade_orders").select("id,buyer_id,supplier_id").eq("id",body.order_id).eq("buyer_id",user.id).maybeSingle();
  if(order.error||!order.data)return out({error:"Only the buyer on an existing order can initiate payment"},403);
  const result=await db.from("vtg_payment_intents").upsert({order_id:order.data.id,payer_id:user.id,payee_id:order.data.supplier_id,amount,currency:body.currency,purpose:body.purpose,idempotency_key:keyValue,status:"created"},{onConflict:"payer_id,idempotency_key",ignoreDuplicates:true}).select().maybeSingle();
  if(result.error)return out({error:"Payment intent could not be created"},403);
  if(!result.data){
   const existing=await db.from("vtg_payment_intents").select("id,order_id,payer_id,payee_id,amount,currency,purpose,status,created_at").eq("payer_id",user.id).eq("idempotency_key",keyValue).single();
   if(existing.error)return out({error:"Could not retrieve existing payment intent"},500);
   return out({payment_intent:existing.data,reused:true});
  }
  return out({payment_intent:result.data,provider_connected:false,note:"Payment intent recorded. No funds have been collected; a verified payment-provider adapter is required to process payment."},201);
 }
 if(seg[0]==="inspections"){
  if(req.method==="GET"){
   const q=await db.from("vtg_inspection_requests").select("id,order_id,requested_by,supplier_id,inspection_type,requested_date,location,scope,status,inspector_id,findings,completed_at,created_at,updated_at").order("created_at",{ascending:false}).limit(100);
   if(q.error)return out({error:"Could not load inspection requests"},403);
   return out({inspections:q.data??[]});
  }
  if(!str(body.order_id)||!str(body.inspection_type)||!body.inspection_type.trim())return out({error:"Order and inspection type are required"},400);
  const order=await db.from("trade_orders").select("id,buyer_id,supplier_id").eq("id",body.order_id).eq("buyer_id",user.id).maybeSingle();
  if(order.error||!order.data)return out({error:"Only the buyer on an existing order can request inspection"},403);
  const q=await db.from("vtg_inspection_requests").insert({order_id:order.data.id,requested_by:user.id,supplier_id:order.data.supplier_id,inspection_type:body.inspection_type.slice(0,120),requested_date:str(body.requested_date)?body.requested_date:null,location:str(body.location)?body.location.slice(0,240):null,scope:str(body.scope)?body.scope.slice(0,4000):null}).select().single();
  if(q.error)return out({error:"Inspection request could not be created"},403);
  return out({inspection:q.data},201);
 }
 return out({error:"Route not found",available:["GET|POST /payments/intents","GET|POST /inspections"]},404);
});