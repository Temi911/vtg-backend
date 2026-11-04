import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const HEADERS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const paystack=async(path:string,secret:string,body?:unknown)=>{
 const r=await fetch("https://api.paystack.co"+path,{method:body?"POST":"GET",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||d.status!==true)throw new Error(typeof d.message==="string"?d.message:"Payment provider request failed");
 return d.data;
};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:HEADERS});
 if(!["POST","GET"].includes(req.method))return json({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),secret=Deno.env.get("PAYSTACK_SECRET_KEY"),rateRaw=Deno.env.get("VTG_INSPECTION_NGN_PER_USD"),callback=Deno.env.get("PAYSTACK_CALLBACK_URL");
 const authHeader=req.headers.get("Authorization")??"",token=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";
 if(!url||!anon||!service||!token)return json({error:"Authentication required"},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),{data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return json({error:"Invalid session"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile}=await db.from("profiles").select("id,role,is_active,email").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||profile.role!=="buyer")return json({error:"An active buyer account is required"},403);
 if(!secret)return json({error:"Paystack is not configured. VTG support must configure the provider secret."},503);
 const rate=Number(rateRaw);
 if(!Number.isFinite(rate)||rate<=0)return json({error:"The approved NGN/USD inspection settlement rate is not configured."},503);
 const body=req.method==="POST"?await req.json().catch(()=>({})): {};
 const u=new URL(req.url),action=u.searchParams.get("action")||String(body.action||"initialize"),inspectionId=String(body.inspectionId||u.searchParams.get("inspectionId")||"").trim();
 if(!inspectionId)return json({error:"Inspection ID is required"},400);
 const {data:inspection,error:inspectionError}=await db.from("vtg_inspection_requests").select("id,reference,requested_by,buyer_fee_usd,payment_status,status").eq("id",inspectionId).eq("requested_by",user.id).maybeSingle();
 if(inspectionError||!inspection)return json({error:"Inspection not found"},404);
 const {data:existing}=await db.from("vtg_inspection_payments").select("*").eq("inspection_id",inspectionId).eq("buyer_id",user.id).maybeSingle();
 if(inspection.payment_status==="paid"||existing?.status==="paid")return json({paid:true,status:"paid",reference:existing?.provider_reference??null});
 if(action==="initialize"){
  const usd=Number(inspection.buyer_fee_usd),ngn=Number((usd*rate).toFixed(2)),kobo=Math.round(ngn*100);
  if(!Number.isFinite(usd)||usd<=0||!Number.isSafeInteger(kobo)||kobo<=0)return json({error:"Inspection fee is invalid"},422);
  const reference="VTG-INS-"+inspection.id+"-"+crypto.randomUUID().replaceAll("-","").slice(0,12);
  const base=callback||"https://vtg-backended.vercel.app/inspection-payment-callback.html";
  const callbackUrl=base+(base.includes("?")?"&":"?")+"inspectionId="+encodeURIComponent(inspection.id);
  let checkout;
  try{checkout=await paystack("/transaction/initialize",secret,{email:profile.email||user.email,amount:kobo,currency:"NGN",reference,callback_url:callbackUrl,metadata:{inspectionId:inspection.id,inspectionReference:inspection.reference,buyerId:user.id,amountUsd:usd,exchangeRate:rate}})}
  catch(e){return json({error:e.message||"Could not initialize payment"},502)}
  const row={inspection_id:inspection.id,buyer_id:user.id,amount_usd:usd,amount_ngn:ngn,currency:"NGN",provider:"paystack",provider_reference:checkout.reference||reference,status:"pending",provider_status:"initialized",checkout_url:checkout.authorization_url,updated_at:new Date().toISOString()};
  const saved=existing
   ? await db.from("vtg_inspection_payments").update(row).eq("id",existing.id).eq("buyer_id",user.id).neq("status","paid").select("id,provider_reference,amount_ngn,status").maybeSingle()
   : await db.from("vtg_inspection_payments").insert(row).select("id,provider_reference,amount_ngn,status").single();
  if(saved.error||!saved.data)return json({error:"Checkout created but the VTG payment record changed concurrently. Contact support before paying again."},409);
  await db.from("vtg_inspection_requests").update({payment_status:"pending",updated_at:new Date().toISOString()}).eq("id",inspection.id).eq("requested_by",user.id).neq("payment_status","paid");
  return json({paid:false,authorizationUrl:checkout.authorization_url,reference:saved.data.provider_reference,amountNgn:ngn,currency:"NGN"});
 }
 if(action==="verify"){
  const reference=String(body.reference||u.searchParams.get("reference")||"").trim();
  if(!reference)return json({error:"Payment reference is required"},400);
  const {data:payment}=await db.from("vtg_inspection_payments").select("*").eq("inspection_id",inspection.id).eq("buyer_id",user.id).eq("provider_reference",reference).maybeSingle();
  if(!payment)return json({error:"Payment reference does not belong to this inspection"},404);
  if(payment.status==="paid")return json({paid:true,status:"paid",reference});
  let result;try{result=await paystack("/transaction/verify/"+encodeURIComponent(reference),secret)}catch(e){return json({error:e.message||"Payment verification failed"},502)}
  const expected=Math.round(Number(payment.amount_ngn)*100);
  if(result.status!=="success")return json({paid:false,status:result.status||"pending"});
  if(result.currency!=="NGN"||Number(result.amount)!==expected||String(result.reference)!==reference)return json({error:"Provider payment details do not match the VTG invoice."},409);
  const customerEmail=String(result.customer?.email||"").toLowerCase();
  if(profile.email&&customerEmail&&customerEmail!==String(profile.email).toLowerCase())return json({error:"The payment customer does not match the buyer account."},409);
  const now=new Date().toISOString();
  const saved=await db.from("vtg_inspection_payments").update({status:"paid",provider_status:"success",paid_at:now,updated_at:now}).eq("id",payment.id).neq("status","paid").select("id").maybeSingle();
  if(saved.error)return json({error:"Payment verified but VTG ledger update failed. Contact support with reference "+reference},500);
  const updated=await db.from("vtg_inspection_requests").update({payment_status:"paid",updated_at:now}).eq("id",inspection.id).eq("requested_by",user.id).neq("payment_status","paid");
  if(updated.error)return json({error:"Payment verified; inspection status needs administrator reconciliation. Reference "+reference},500);
  return json({paid:true,status:"paid",reference,amountNgn:payment.amount_ngn,currency:"NGN"});
 }
 return json({error:"Unsupported payment action"},400);
});