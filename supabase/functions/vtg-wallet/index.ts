import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json"};
const out=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:h});
const str=(x:unknown):x is string=>typeof x==="string";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(!["GET","POST"].includes(req.method))return out({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const auth=req.headers.get("Authorization")??"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!url||!anon||!service||!token)return out({error:"Authentication required"},401);
 const userDb=createClient(url,anon,{auth:{persistSession:false}}),identity=await userDb.auth.getUser(token);
 if(identity.error||!identity.data.user)return out({error:"Invalid session"},401);
 const user=identity.data.user,admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const p=await admin.from("profiles").select("id,email,full_name,role,is_active").eq("id",user.id).maybeSingle();
 if(p.error||!p.data||!p.data.is_active)return out({error:"Active VTG profile required"},403);
 if(req.method==="GET"){
  const [accounts,transfers,ledger]=await Promise.all([
   admin.from("vtg_wallet_accounts").select("id,currency,balance,status,updated_at").eq("user_id",user.id).order("currency"),
   admin.from("vtg_wallet_transfers").select("id,sender_id,recipient_id,currency,amount,note,status,created_at").or("sender_id.eq."+user.id+",recipient_id.eq."+user.id).order("created_at",{ascending:false}).limit(100),
   admin.from("vtg_wallet_ledger").select("id,account_id,transfer_id,entry_type,amount,balance_after,description,created_at").in("account_id",(await admin.from("vtg_wallet_accounts").select("id").eq("user_id",user.id)).data?.map(x=>x.id)??[]).order("created_at",{ascending:false}).limit(200)
  ]);
  if(accounts.error||transfers.error||ledger.error)return out({error:"Wallet records unavailable"},500);
  return out({balances:accounts.data??[],transactions:transfers.data??[],ledger:ledger.data??[]});
 }
 const body=await req.json().catch(()=>({})),email=str(body.recipientEmail)?body.recipientEmail.trim().toLowerCase():"",amount=Number(body.amount),currency=body.currency,key=str(body.idempotency_key)?body.idempotency_key:"";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!Number.isFinite(amount)||amount<=0||amount>1e9||Math.round(amount*100)!==amount*100||!["USD","NGN","CNY"].includes(currency)||key.length<8||key.length>120)
  return out({error:"Provide recipient email, positive amount (maximum two decimals), supported currency and idempotency_key"},400);
 const recipient=await admin.from("profiles").select("id,email,full_name,is_active").ilike("email",email).maybeSingle();
 if(recipient.error||!recipient.data||!recipient.data.is_active)return out({error:"Recipient not found on VTG"},404);
 if(recipient.data.id===user.id)return out({error:"You cannot send money to yourself"},400);
 const result=await admin.rpc("vtg_wallet_transfer",{p_sender:user.id,p_recipient:recipient.data.id,p_currency:currency,p_amount:amount,p_note:str(body.note)?body.note.slice(0,500):null,p_idempotency_key:key});
 if(result.error){const msg=result.error.message??"Transfer failed";const status=/Insufficient wallet balance/i.test(msg)?409:/idempotency/i.test(msg)?409:400;return out({error:msg},status);}
 return out({message:"Wallet transfer recorded",transfer:result.data},201);
});