import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,PATCH","Content-Type":"application/json"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H}),str=(v:unknown)=>typeof v==="string"?v.trim():"";
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(!["GET","POST","PATCH"].includes(req.method))return out({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authHeader=req.headers.get("Authorization")??"",token=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";
 if(!url||!anon||!secret||!token)return out({error:"Authentication required"},401);
 const client=createClient(url,anon,{auth:{persistSession:false}}),who=await client.auth.getUser(token);
 if(who.error||!who.data.user)return out({error:"Invalid session"},401);
 const user=who.data.user,db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const p=await db.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!p.data?.is_active)return out({error:"Active profile required"},403);
 const member=await db.from("vtg_workforce_members").select("workspace_role").eq("user_id",user.id).eq("workspace_role","agent").eq("status","active").maybeSingle();
 const admin=p.data.role==="admin",role=member.data?"agent":p.data.role;
 const u=new URL(req.url),parts=u.pathname.split("/vtg-verification").pop()?.split("/").filter(Boolean)??[],action=parts.join("/"),body=req.method==="GET"?{}:await req.json().catch(()=>({}));
 const types:Record<string,string[]>={supplier:["company_registration","business_license","tax_certificate","export_license","company_address_proof","other"],bank:["bank_license","regulatory_certificate","company_registration","swift_bic_certificate","institution_address_proof","officer_authorization","other"],agent:["government_id","proof_of_address","business_registration","professional_certificate","reference_document","other"]};
 if(action==="documents"&&req.method==="GET"){
  if(!["supplier","bank","agent"].includes(role))return out({error:"Business applicant account required"},403);
  const q=await db.from("vtg_verification_documents").select("id,account_role,doc_type,file_name,mime_type,file_size_bytes,status,review_notes,uploaded_at,reviewed_at,expires_at").eq("user_id",user.id).order("uploaded_at",{ascending:false});
  return q.error?out({error:"Could not load documents"},500):out({documents:q.data});
 }
 if(action==="upload-url"&&req.method==="POST"){
  if(!["supplier","bank","agent"].includes(role))return out({error:"Business applicant account required"},403);
  const kind=str(body.docType),name=str(body.fileName),mime=str(body.mimeType),size=Number(body.fileSize);
  if(!(types[role]??[]).includes(kind)||!name||name.length>180||!["image/jpeg","image/png","image/webp","application/pdf"].includes(mime)||!Number.isInteger(size)||size<1||size>52428800)return out({error:"Invalid document type or file details"},400);
  const path=user.id+"/"+crypto.randomUUID()+"-"+name.replace(/[^a-zA-Z0-9._-]/g,"_"),signed=await db.storage.from("vtg-verification-documents").createSignedUploadUrl(path);
  if(signed.error)return out({error:"Could not create secure upload URL"},500);
  return out({uploadUrl:signed.data.signedUrl,token:signed.data.token,path,docType:kind,fileName:name,mimeType:mime,fileSizeBytes:size},201);
 }
 if(action==="documents"&&req.method==="POST"){
  if(!["supplier","bank","agent"].includes(role))return out({error:"Business applicant account required"},403);
  const path=str(body.path),kind=str(body.docType),name=str(body.fileName),mime=str(body.mimeType),size=Number(body.fileSizeBytes);
  if(!path.startsWith(user.id+"/")||!(types[role]??[]).includes(kind)||!name||!Number.isInteger(size)||size<1||size>52428800)return out({error:"Invalid document metadata"},400);
  const object=await db.storage.from("vtg-verification-documents").list(user.id,{search:path.split("/").pop()});
  if(object.error||!object.data?.some(x=>x.name===path.split("/").pop()))return out({error:"Uploaded file not found"},422);
  const q=await db.from("vtg_verification_documents").insert({user_id:user.id,account_role:role,doc_type:kind,file_name:name,storage_path:path,mime_type:mime,file_size_bytes:size}).select("id,doc_type,file_name,status,uploaded_at").single();
  return q.error?out({error:"Could not register verification document"},400):out({document:q.data},201);
 }
 if(action==="review-queue"&&req.method==="GET"){
  if(!admin)return out({error:"Administrator required"},403);
  const q=await db.from("vtg_verification_documents").select("id,user_id,account_role,doc_type,file_name,mime_type,file_size_bytes,status,uploaded_at,profiles(email,full_name)").eq("status","pending").order("uploaded_at");
  return q.error?out({error:"Review queue unavailable"},500):out({documents:q.data});
 }
 if(parts[0]==="documents"&&parts[1]&&parts[2]==="download"&&req.method==="GET"){
  const q=await db.from("vtg_verification_documents").select("user_id,storage_path").eq("id",parts[1]).maybeSingle();
  if(!q.data||(!admin&&q.data.user_id!==user.id))return out({error:"Document not found"},404);
  const signed=await db.storage.from("vtg-verification-documents").createSignedUrl(q.data.storage_path,90);
  return signed.error?out({error:"Could not create private download link"},500):out({url:signed.data.signedUrl,expiresIn:90});
 }
 if(parts[0]==="documents"&&parts[1]&&parts[2]==="review"&&req.method==="PATCH"){
  if(!admin)return out({error:"Administrator required"},403);
  const status=str(body.status),notes=str(body.notes),expires=str(body.expiresAt);
  if(!["verified","rejected"].includes(status)||status==="rejected"&&!notes||expires&&(status!=="verified"||!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()))return out({error:"Invalid review decision; rejection requires notes and expiry must be future"},400);
  const q=await db.from("vtg_verification_documents").update({status,review_notes:notes||null,reviewer_id:user.id,reviewed_at:new Date().toISOString(),expires_at:status==="verified"&&expires?expires:null}).eq("id",parts[1]).eq("status","pending").select("id,user_id,account_role,doc_type,status,review_notes,reviewed_at,expires_at").maybeSingle();
  return q.error||!q.data?out({error:"Document not found, already reviewed, or review failed"},409):out({document:q.data});
 }
 return out({error:"Route not found"},404);
});