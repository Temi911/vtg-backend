import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,PATCH,OPTIONS","Content-Type":"application/json"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const text=(x:unknown)=>typeof x==="string"?x.trim():"";
const ref=()=>"INS-"+new Date().getUTCFullYear()+"-"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(!["GET","POST","PATCH"].includes(req.method))return out({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),bearer=req.headers.get("Authorization")??"",token=bearer.startsWith("Bearer ")?bearer.slice(7):"";
 if(!url||!anon||!secret||!token)return out({error:"Authentication required"},401);
 const auth=createClient(url,anon,{auth:{persistSession:false}}),who=await auth.auth.getUser(token);
 if(who.error||!who.data.user)return out({error:"Invalid session"},401);
 const user=who.data.user,db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile}=await db.from("profiles").select("id,role,is_active,email").eq("id",user.id).maybeSingle();
 if(!profile?.is_active)return out({error:"Active VTG profile required"},403);
 const {data:workforce}=await db.from("vtg_workforce_members").select("workspace_role,status").eq("user_id",user.id).eq("status","active");
 const isAdmin=profile.role==="admin",isAgent=(workforce??[]).some(x=>x.workspace_role==="agent");
 const u=new URL(req.url),parts=u.pathname.split("/vtg-inspection-workflow").pop()?.split("/").filter(Boolean)??[],action=parts.join("/"),body=req.method==="GET"?{}:await req.json().catch(()=>({}));
 const own=()=>db.from("vtg_inspection_requests").select("*").eq("id",parts[1]).maybeSingle();
 if(action==="admin/pricing"&&(req.method==="POST"||req.method==="PATCH")){
  if(!isAdmin)return out({error:"Administrator required"},403);
  const country=text(body.country),category=text(body.category).toLowerCase()||"general-merchandise",level=text(body.serviceLevel),min=Number(body.minQuantity??1),max=body.maxQuantity==null?null:Number(body.maxQuantity),buyer=Number(body.buyerFeeUsd),payout=Number(body.agentPayoutUsd);
  if(!["China","South Korea"].includes(country)||!["basic","standard","advanced"].includes(level)||!Number.isInteger(min)||min<1||max!==null&&(!Number.isInteger(max)||max<min)||!Number.isFinite(buyer)||buyer<0||!Number.isFinite(payout)||payout<0||payout>buyer)return out({error:"Invalid inspection pricing rule"},400);
  const row={country,category,service_level:level,min_quantity:min,max_quantity:max,buyer_fee_usd:buyer,agent_payout_usd:payout,active:body.active!==false,updated_at:new Date().toISOString()};
  if(req.method==="PATCH"&&text(body.id)){
   const q=await db.from("vtg_inspection_pricing").update(row).eq("id",text(body.id)).select().single();
   return q.error?out({error:"Could not update pricing rule"},400):out({pricing:q.data});
  }
  const q=await db.from("vtg_inspection_pricing").insert(row).select().single();
  return q.error?out({error:"Could not create pricing rule"},400):out({pricing:q.data},201);
 }
 if(action==="pricing"&&req.method==="GET"){
  const q=await db.from("vtg_inspection_pricing").select("country,category,service_level,min_quantity,max_quantity,buyer_fee_usd,agent_payout_usd").eq("active",true);
  return q.error?out({error:"Pricing unavailable"},500):out({pricing:q.data});
 }
 if(action==="quote"&&req.method==="POST"){
  if(profile.role!=="buyer")return out({error:"Buyer account required"},403);
  const country=text(body.country),category=text(body.category).toLowerCase(),qty=Number(body.quantity),level=text(body.serviceLevel)||"standard";
  if(!["China","South Korea"].includes(country)||!category||!Number.isInteger(qty)||qty<1||!["basic","standard","advanced"].includes(level))return out({error:"Invalid inspection quote request"},400);
  const q=await db.from("vtg_inspection_pricing").select("*").eq("country",country).eq("service_level",level).eq("active",true).lte("min_quantity",qty).or("max_quantity.is.null,max_quantity.gte."+qty).in("category",[category,"general-merchandise"]).order("category",{ascending:false}).limit(1).maybeSingle();
  if(q.error||!q.data)return out({error:"No active price configured for this inspection"},422);
  const buyer=Number(q.data.buyer_fee_usd)+(body.addVideo?5:0)+(body.urgent?10:0),payout=Number(q.data.agent_payout_usd)+(body.addVideo?3:0)+(body.urgent?7:0);
  return out({quote:{buyerFeeUsd:buyer,agentPayoutUsd:payout,serviceMarginUsd:buyer-payout,currency:"USD"}});
 }
 if(action==="requests"&&req.method==="POST"){
  if(profile.role!=="buyer")return out({error:"Buyer account required"},403);
  const orderId=text(body.orderId);if(!orderId)return out({error:"A valid trade order is required"},400);
  const order=await db.from("trade_orders").select("id,buyer_id,supplier_id,status").eq("id",orderId).eq("buyer_id",user.id).maybeSingle();
  if(order.error||!order.data||["cancelled","delivered"].includes(order.data.status))return out({error:"Eligible order not found"},403);
  const country=text(body.country),level=text(body.serviceLevel)||"standard",qty=Number(body.quantity),category=text(body.category);
  if(!["China","South Korea"].includes(country)||!category||!Number.isInteger(qty)||qty<1||!text(body.city)||!text(body.productName))return out({error:"Country, city, product, category and quantity are required"},400);
  const pricing=await db.from("vtg_inspection_pricing").select("*").eq("country",country).eq("service_level",level).eq("active",true).lte("min_quantity",qty).or("max_quantity.is.null,max_quantity.gte."+qty).in("category",[category.toLowerCase(),"general-merchandise"]).order("category",{ascending:false}).limit(1).maybeSingle();
  if(pricing.error||!pricing.data)return out({error:"Inspection pricing is not configured"},422);
  const buyer=Number(pricing.data.buyer_fee_usd)+(body.addVideo?5:0)+(body.urgent?10:0),payout=Number(pricing.data.agent_payout_usd)+(body.addVideo?3:0)+(body.urgent?7:0);
  const q=await db.from("vtg_inspection_requests").insert({reference:ref(),order_id:orderId,requested_by:user.id,supplier_id:order.data.supplier_id,country,city:text(body.city),supplier_name:text(body.supplierName)||null,supplier_address:text(body.supplierAddress)||null,supplier_contact:text(body.supplierContact)||null,product_name:text(body.productName),category,quantity:qty,service_level:level,inspection_type:level,scope:text(body.requestedChecks)||null,buyer_fee_usd:buyer,agent_payout_usd:payout,status:"requested"}).select().single();
  if(q.error)return out({error:"Could not create inspection request"},400);
  return out({request:q.data,payment:{status:"unpaid",amountUsd:buyer}},201);
 }
 if(action==="mine"&&req.method==="GET"){
  const q=await db.from("vtg_inspection_requests").select("*").eq("requested_by",user.id).order("created_at",{ascending:false});
  return q.error?out({error:"Could not load inspections"},500):out({requests:q.data});
 }
 if(action==="agent/queue"&&req.method==="GET"){
  if(!isAgent&&!isAdmin)return out({error:"Active inspector membership required"},403);
  const q=await db.from("vtg_inspection_requests").select("*").in("status",["requested","accepted","scheduled","in_progress"]).order("created_at");
  return q.error?out({error:"Could not load inspection queue"},500):out({requests:q.data});
 }
 if(action==="admin/queue"&&req.method==="GET"){
  if(!isAdmin)return out({error:"Administrator required"},403);
  const q=await db.from("vtg_inspection_requests").select("*").order("created_at",{ascending:false});
  return q.error?out({error:"Could not load inspection queue"},500):out({requests:q.data});
 }
 if(parts[0]==="requests"&&parts[1]&&parts[2]==="assign"&&req.method==="PATCH"){
  if(!isAdmin)return out({error:"Administrator required"},403);
  const agentId=text(body.agentId),member=await db.from("vtg_workforce_members").select("user_id").eq("user_id",agentId).eq("workspace_role","agent").eq("status","active").maybeSingle();
  if(!member.data)return out({error:"An active approved workforce inspector is required"},422);
  const {data:item}=await own();if(!item)return out({error:"Inspection not found"},404);
  if(item.payment_status!=="paid")return out({error:"Verified inspection payment is required before assignment"},409);
  const q=await db.from("vtg_inspection_requests").update({inspector_id:agentId,status:"accepted",assigned_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id).is("inspector_id",null).select().maybeSingle();
  return q.error||!q.data?out({error:"Assignment conflict; refresh and retry"},409):out({request:q.data});
 }
 if(parts[0]==="requests"&&parts[1]&&parts[2]==="start"&&req.method==="POST"){
  if(!isAgent)return out({error:"Active inspector membership required"},403);
  const {data:item}=await own();if(!item||item.inspector_id!==user.id||!["accepted","scheduled"].includes(item.status))return out({error:"Inspection is not assigned to you"},404);
  const q=await db.from("vtg_inspection_requests").update({status:"in_progress",updated_at:new Date().toISOString()}).eq("id",item.id).eq("inspector_id",user.id).select().single();
  return q.error?out({error:"Could not start inspection"},409):out({request:q.data});
 }
 if(parts[0]==="requests"&&parts[1]&&parts[2]==="evidence-upload"&&req.method==="POST"){
  if(!isAgent)return out({error:"Active inspector membership required"},403);
  const {data:item}=await own();if(!item||item.inspector_id!==user.id||item.status!=="in_progress")return out({error:"Inspection is not assigned to you"},404);
  const filename=text(body.fileName),mime=text(body.mimeType),size=Number(body.fileSize),kind=text(body.evidenceType);
  if(!filename||filename.length>180||!["image/jpeg","image/png","image/webp","application/pdf","video/mp4"].includes(mime)||!Number.isInteger(size)||size<1||size>52428800||!["photo","video","document"].includes(kind))return out({error:"Invalid evidence file details"},400);
  if(kind==="video"&&mime!=="video/mp4"||kind==="photo"&&!mime.startsWith("image/")||kind==="document"&&!["application/pdf"].includes(mime))return out({error:"File type does not match evidence category"},400);
  const safe=crypto.randomUUID()+"-"+filename.replace(/[^a-zA-Z0-9._-]/g,"_"),path=item.id+"/"+user.id+"/"+safe;
  const signed=await db.storage.from("vtg-inspection-evidence").createSignedUploadUrl(path);
  if(signed.error)return out({error:"Could not create secure upload URL"},500);
  return out({uploadUrl:signed.data.signedUrl,token:signed.data.token,path,inspectionId:item.id,evidenceType:kind,fileName:filename,mimeType:mime,fileSizeBytes:size},201);
 }
 if(parts[0]==="requests"&&parts[1]&&parts[2]==="evidence"&&req.method==="POST"){
  if(!isAgent)return out({error:"Active inspector membership required"},403);
  const {data:item}=await own();if(!item||item.inspector_id!==user.id||item.status!=="in_progress")return out({error:"Inspection is not assigned to you"},404);
  const path=text(body.path),filename=text(body.fileName),mime=text(body.mimeType),size=Number(body.fileSizeBytes),kind=text(body.evidenceType);
  if(!path.startsWith(item.id+"/"+user.id+"/")||!filename||!Number.isInteger(size)||size<1||size>52428800||!["photo","video","document"].includes(kind))return out({error:"Invalid evidence metadata"},400);
  const exists=await db.storage.from("vtg-inspection-evidence").list(item.id+"/"+user.id,{search:path.split("/").pop()});
  if(exists.error||!exists.data?.some(x=>x.name===path.split("/").pop()))return out({error:"Uploaded evidence object was not found"},422);
  const q=await db.from("vtg_inspection_evidence").insert({inspection_id:item.id,uploaded_by:user.id,storage_path:path,file_name:filename,mime_type:mime,file_size_bytes:size,evidence_type:kind,notes:text(body.notes)||null}).select().single();
  return q.error?out({error:"Could not register inspection evidence"},400):out({evidence:q.data},201);
 }
 if(parts[0]==="requests"&&parts[1]&&parts[2]==="submit"&&req.method==="POST"){
  if(!isAgent)return out({error:"Active inspector membership required"},403);
  const {data:item}=await own();if(!item||item.inspector_id!==user.id||item.status!=="in_progress")return out({error:"Inspection is not in progress under your assignment"},404);
  const summary=text(body.summary);if(summary.length<20||summary.length>5000)return out({error:"Inspection report must be 20–5000 characters"},400);
  const evidence=await db.from("vtg_inspection_evidence").select("id").eq("inspection_id",item.id).eq("uploaded_by",user.id).limit(1);
  if(evidence.error||!evidence.data?.length)return out({error:"Upload at least one evidence item before submitting"},422);
  const q=await db.from("vtg_inspection_requests").update({findings:summary,inspection_summary:summary,status:"completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id).eq("inspector_id",user.id).eq("status","in_progress").select().single();
  return q.error?out({error:"Could not submit report"},409):out({request:q.data});
 }
 if(parts[0]==="requests"&&parts[1]&&parts[2]==="decision"&&req.method==="PATCH"){
  const {data:item}=await own();if(!item||item.requested_by!==user.id||item.status!=="completed")return out({error:"Completed inspection not found for this buyer"},404);
  const decision=text(body.decision),notes=text(body.notes);
  if(!["approved","needs_clarification","rejected"].includes(decision))return out({error:"Invalid buyer decision"},400);
  const q=await db.from("vtg_inspection_requests").update({buyer_decision:decision,buyer_notes:notes||null,updated_at:new Date().toISOString()}).eq("id",item.id).eq("requested_by",user.id).eq("status","completed").is("buyer_decision",null).select().single();
  return q.error?out({error:"Decision could not be recorded"},409):out({request:q.data});
 }
 return out({error:"Route not found"},404);
});