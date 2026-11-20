import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const roles = new Set(["staff","manager","agent","logistics","compliance","support","finance","inspector","marketing"]);
const statuses = new Set(["open","in_progress","blocked","completed","cancelled"]);
const priorities = new Set(["low","normal","high","urgent"]);
const cors = {"Access-Control-Allow-Origin":Deno.env.get("APP_SITE_URL")??"https://vtg-backended.vercel.app","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clean=(v:unknown,max=4000)=>typeof v==="string"?v.trim().slice(0,max):"";
const makeRef=()=>"WFT-"+new Date().getUTCFullYear()+"-"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(!["GET","POST","PATCH"].includes(req.method))return reply({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return reply({error:"Server configuration incomplete"},500);
 const header=req.headers.get("Authorization")??"",token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return reply({error:"Authentication required"},401);
 const identity=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const verified=await identity.auth.getUser(token),caller=verified.data.user;
 if(verified.error||!caller)return reply({error:"Invalid session"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:pe}=await db.from("profiles").select("id,role,is_active,account_environment").eq("id",caller.id).maybeSingle();
 if(pe||!profile||profile.account_environment!=="staff"||!profile.is_active)return reply({error:"Active staff account required"},403);
 const {data:memberships,error:me}=await db.from("vtg_workforce_members").select("workspace_role,status").eq("user_id",caller.id).eq("status","active");
 if(me)return reply({error:"Could not verify workforce permissions"},500);
 const isAdmin=profile.role==="admin",memberRoles=new Set((memberships??[]).map((m:any)=>m.workspace_role));
 if(!isAdmin&&!memberRoles.size)return reply({error:"Active workforce assignment required"},403);
 const suffix=new URL(req.url).pathname.split("/workforce-operations").pop()??"",parts=suffix.split("/").filter(Boolean),body=req.method==="GET"?{}:await req.json().catch(()=>({}));
 const query=new URL(req.url).searchParams,requested=clean(query.get("workspace"),40).toLowerCase();
 const workspace=requested||(memberRoles.has("staff")?"staff":[...memberRoles][0]);
 if(!roles.has(workspace))return reply({error:"Unknown workspace"},400);
 const isManager=isAdmin||memberRoles.has("manager");
 if(!isManager&&!memberRoles.has(workspace))return reply({error:"Workspace access denied"},403);
 const log=async(event_type:string,task_id:string|null,handoff_id:string|null,details:Record<string,unknown>={})=>{
  const r=await db.from("vtg_workforce_activity").insert({actor_id:caller.id,event_type,task_id,handoff_id,details});
  if(r.error)console.error("Workforce activity write failed",r.error.message);
 };
 const visibleTask=async(id:string)=>{
  let q=db.from("vtg_workforce_tasks").select("*").eq("id",id);
  if(!isManager)q=q.eq("assigned_to",caller.id);
  return await q.maybeSingle();
 };
 if(req.method==="GET"&&!parts.length){
  let tq=db.from("vtg_workforce_tasks").select("id,reference,workspace_role,title,description,status,priority,created_by,assigned_to,due_at,entity_type,entity_id,completed_at,created_at,updated_at").order("due_at",{ascending:true,nullsFirst:false}).limit(150);
  if(!isManager)tq=tq.eq("assigned_to",caller.id).eq("workspace_role",workspace);
  else if(!isAdmin&&workspace!=="manager")tq=tq.eq("workspace_role",workspace);
  const {data:tasks,error:te}=await tq;if(te)return reply({error:"Could not load workforce tasks"},500);
  let hq=db.from("vtg_workforce_handoffs").select("id,task_id,from_workspace_role,to_workspace_role,initiated_by,proposed_assignee,accepted_by,status,note,created_at,decided_at").order("created_at",{ascending:false}).limit(100);
  if(!isManager)hq=hq.or("initiated_by.eq."+caller.id+",proposed_assignee.eq."+caller.id+",to_workspace_role.eq."+workspace);
  else if(!isAdmin&&workspace!=="manager")hq=hq.or("from_workspace_role.eq."+workspace+",to_workspace_role.eq."+workspace);
  const {data:handoffs,error:he}=await hq;if(he)return reply({error:"Could not load handoffs"},500);
  const rows=tasks??[],open=rows.filter(t=>!["completed","cancelled"].includes(t.status));
  return reply({workspace,permissions:{canManage:isManager},summary:{tasks:rows.length,open:open.length,completed:rows.filter(t=>t.status==="completed").length,handoffs:(handoffs??[]).filter(h=>h.status==="pending").length,overdue:open.filter(t=>t.due_at&&new Date(t.due_at).getTime()<Date.now()).length},tasks:rows,handoffs:handoffs??[]});
 }
 if(req.method==="POST"&&parts[0]==="tasks"){
  if(!isManager)return reply({error:"A manager or administrator must create and assign tasks"},403);
  const target=clean(body.workspace_role,40).toLowerCase(),title=clean(body.title,180),description=clean(body.description,4000),assignee=clean(body.assigned_to,80),priority=clean(body.priority,20)||"normal";
  if(!roles.has(target)||title.length<3||!priorities.has(priority))return reply({error:"A valid workspace, title and priority are required"},400);
  if(assignee){const {data:m}=await db.from("vtg_workforce_members").select("user_id").eq("user_id",assignee).eq("workspace_role",target).eq("status","active").maybeSingle();if(!m)return reply({error:"Assignee is not an active member of the selected workspace"},422);}
  const due=body.due_at?new Date(body.due_at):null;if(body.due_at&&(!due||Number.isNaN(due.getTime())))return reply({error:"Invalid due date"},400);
  const {data:task,error}=await db.from("vtg_workforce_tasks").insert({reference:makeRef(),workspace_role:target,title,description,priority,created_by:caller.id,assigned_to:assignee||null,due_at:due?.toISOString()??null,entity_type:clean(body.entity_type,40)||null,entity_id:clean(body.entity_id,80)||null}).select("*").single();
  if(error)return reply({error:"Could not create workforce task"},500);
  await log("task_created",task.id,null,{reference:task.reference,workspace_role:target,assigned_to:assignee||null});return reply({task},201);
 }
 if(req.method==="PATCH"&&parts[0]==="tasks"&&parts[1]){
  const {data:task,error}=await visibleTask(parts[1]);if(error||!task)return reply({error:"Task not found or not assigned to you"},404);
  const patch:Record<string,unknown>={};
  if(body.status!==undefined){if(!statuses.has(body.status))return reply({error:"Invalid task status"},400);patch.status=body.status;}
  if(body.note!==undefined)patch.description=clean(body.note,4000);
  if(body.priority!==undefined){if(!isManager||!priorities.has(body.priority))return reply({error:"Only managers can change task priority"},403);patch.priority=body.priority;}
  if(body.assigned_to!==undefined){if(!isManager)return reply({error:"Only managers can reassign tasks"},403);if(body.assigned_to){const {data:m}=await db.from("vtg_workforce_members").select("user_id").eq("user_id",body.assigned_to).eq("workspace_role",task.workspace_role).eq("status","active").maybeSingle();if(!m)return reply({error:"Assignee is not an active member of this workspace"},422);}patch.assigned_to=body.assigned_to||null;}
  if(!Object.keys(patch).length)return reply({error:"No supported task changes supplied"},400);
  const {data:updated,error:ue}=await db.from("vtg_workforce_tasks").update(patch).eq("id",task.id).select("*").single();if(ue)return reply({error:"Could not update task"},500);
  await log(updated.status==="completed"?"task_completed":"task_updated",updated.id,null,{changed_fields:Object.keys(patch),status:updated.status});return reply({task:updated});
 }
 if(req.method==="POST"&&parts[0]==="handoffs"){
  const taskId=clean(body.task_id,80),to=clean(body.to_workspace_role,40).toLowerCase();if(!roles.has(to))return reply({error:"A valid receiving workspace is required"},400);
  const {data:task,error}=await visibleTask(taskId);if(error||!task)return reply({error:"Task not found or not assigned to you"},404);
  if(!isManager&&task.assigned_to!==caller.id)return reply({error:"Only the task owner or manager can hand off this task"},403);
  if(to===task.workspace_role)return reply({error:"Choose a different receiving workspace"},400);
  const proposed=clean(body.proposed_assignee,80);
  if(proposed){const {data:m}=await db.from("vtg_workforce_members").select("user_id").eq("user_id",proposed).eq("workspace_role",to).eq("status","active").maybeSingle();if(!m)return reply({error:"Receiving assignee is not an active workspace member"},422);}
  const {data:handoff,error:he}=await db.from("vtg_workforce_handoffs").insert({task_id:task.id,from_workspace_role:task.workspace_role,to_workspace_role:to,initiated_by:caller.id,proposed_assignee:proposed||null,note:clean(body.note,2000)}).select("*").single();
  if(he)return reply({error:"Could not create handoff"},500);await log("handoff_created",task.id,handoff.id,{from:task.workspace_role,to});return reply({handoff},201);
 }
 if(req.method==="PATCH"&&parts[0]==="handoffs"&&parts[1]){
  const decision=clean(body.decision,20);if(!["accept","reject"].includes(decision))return reply({error:"Choose accept or reject"},400);
  const {data:handoff,error}=await db.from("vtg_workforce_handoffs").select("*").eq("id",parts[1]).eq("status","pending").maybeSingle();if(error||!handoff)return reply({error:"Pending handoff not found"},404);
  if(!isAdmin&&!isManager&&!memberRoles.has(handoff.to_workspace_role))return reply({error:"Receiving workspace access required"},403);
  const {data:changed,error:ce}=await db.from("vtg_workforce_handoffs").update({status:decision==="accept"?"accepted":"rejected",accepted_by:caller.id,decided_at:new Date().toISOString()}).eq("id",handoff.id).eq("status","pending").select("*").single();
  if(ce)return reply({error:"Handoff has already been decided or could not be updated"},409);
  if(decision==="accept"){const update:Record<string,unknown>={workspace_role:handoff.to_workspace_role};if(handoff.proposed_assignee)update.assigned_to=handoff.proposed_assignee;const {error:te}=await db.from("vtg_workforce_tasks").update(update).eq("id",handoff.task_id);if(te)return reply({error:"Handoff accepted but task transfer needs administrator review"},500);}
  await log(decision==="accept"?"handoff_accepted":"handoff_rejected",handoff.task_id,handoff.id,{decision,to:handoff.to_workspace_role});return reply({handoff:changed});
 }
 return reply({error:"Route not found"},404);
});
