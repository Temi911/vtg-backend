/* VTG account messages — WhatsApp-style chats between trade-linked buyers, suppliers and banks.
   Own messages: right (blue). Other people: left, named, each with their own colour. */
(function(){
'use strict';
const host=document.querySelector('[data-vtg-peer-chat]');if(!host||!window.VTGChat)return;
const C=window.VTGChat,I=C.icons,esc=C.esc;
const role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank'};
host.className='vtg-wa vtg-wa-messages';
host.innerHTML='<aside class="vtg-wa-side"><div class="vtg-wa-sidehead"><strong>Chats</strong><button type="button" class="vtg-wa-sidebtn" data-new>'+I.plus+' New chat</button><button type="button" class="vtg-wa-sidebtn ghost" data-refresh>Refresh</button></div><div data-picker hidden></div><div class="vtg-wa-list" data-list role="list"></div></aside>'
 +'<div class="vtg-wa-main"><header class="vtg-wa-head"><button type="button" class="vtg-wa-iconbtn vtg-wa-back" data-back aria-label="Back to chats">'+I.back+'</button><div class="vtg-wa-avatar" data-avatar>V</div><div class="vtg-wa-title"><strong data-title>Choose a chat</strong><small data-sub>Secure account-linked trade messages</small></div><div class="vtg-wa-actions"><button type="button" class="vtg-wa-iconbtn" data-voice aria-label="Start voice call" title="Voice call (up to 5 people)" disabled>'+I.phone+'</button><button type="button" class="vtg-wa-iconbtn" data-video aria-label="Start video call" title="Video call (up to 5 people)" disabled>'+I.video+'</button></div></header>'
 +'<div class="vtg-wa-callbar" data-callbar><span data-calltext></span><button type="button" data-joincall>Join</button></div>'
 +'<div class="vtg-wa-stream" data-log role="log" aria-live="polite"></div>'
 +'<div class="vtg-wa-file-pending" data-pending-files hidden></div><form class="vtg-wa-compose" data-form><input type="file" data-file-input multiple hidden accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,application/pdf,text/plain,text/csv,image/*,video/*"><button type="button" class="vtg-wa-attach" data-attach aria-label="Attach files" title="Attach files">'+I.plus+'</button><textarea data-input rows="1" maxlength="4000" placeholder="Type a message or attach files" aria-label="Type a message"></textarea><button class="vtg-wa-send" data-send type="submit" aria-label="Send message">'+I.send+'</button></form>
 +'<div class="vtg-wa-note">Only people in a chat can read messages and attachments. You can share documents, pictures and videos with partners linked to your trade records. Files are stored privately and access is limited to chat participants. Do not share passwords, one-time codes or bank credentials.</div></div>';
const $=s=>host.querySelector(s);
const list=$('[data-list]'),log=$('[data-log]'),form=$('[data-form]'),input=$('[data-input]'),sendBtn=$('[data-send]'),picker=$('[data-picker]'),fileInput=$('[data-file-input]'),pendingFiles=$('[data-pending-files]');
const titleEl=$('[data-title]'),subEl=$('[data-sub]'),avatarEl=$('[data-avatar]'),voiceBtn=$('[data-voice]'),videoBtn=$('[data-video]'),callbar=$('[data-callbar]');
let client=null,userId='',convs=[],activeId='',members={},messages=[],busy=false,channel=null,callChannel=null,liveCalls={},queuedFiles=[];
const memberCache={};

function empty(el,text){el.innerHTML='<div class="vtg-wa-empty">'+esc(text)+'</div>';}
async function boot(){
 const s=await C.clientReady();client=s.client;userId=s.userId;
 const {data:profile,error}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
 if(error)throw error;
 if(!profile?.is_active||profile.role!==role)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required.');
}
async function membersOf(id){
 if(memberCache[id])return memberCache[id];
 const {data,error}=await client.rpc('vtg_conversation_members',{p_conversation_id:id});
 if(error)throw error;
 const tones=C.toneMap((data||[]).map(m=>m.user_id),userId);
 const map={};(data||[]).forEach(m=>{map[m.user_id]={id:m.user_id,name:m.display_name,role:m.role,tone:tones[String(m.user_id)]??0,me:String(m.user_id)===String(userId)};});
 return (memberCache[id]=map);
}
function convTitle(c){
 const others=Object.values(c.members||{}).filter(m=>!m.me).map(m=>m.name);
 return c.title||others.join(', ')||'Trade chat';
}
function renderList(){
 if(!convs.length){empty(list,'No chats yet. Tap “New chat” to message a partner linked to your trade records.');return;}
 list.innerHTML=convs.map(c=>{
  const t=convTitle(c),live=liveCalls[c.id];
  return '<button type="button" role="listitem" class="vtg-wa-item'+(String(c.id)===String(activeId)?' active':'')+'" data-open="'+esc(c.id)+'"><div class="vtg-wa-avatar">'+esc(C.initials(t))+'</div><div class="vtg-wa-item-body"><div class="vtg-wa-item-top"><strong>'+esc(t)+'</strong><time>'+(c.last_at?esc(C.time(c.last_at)):'')+'</time></div><small>'+(live?'<span class="vtg-wa-live">Call in progress</span>':esc(c.last_message||'No messages yet'))+'</small></div></button>';
 }).join('');
}
async function loadList(){
 empty(list,'Loading chats…');
 try{
  if(!client)await boot();
  const {data:rows,error}=await client.from('conversations').select('id,title,is_group,created_at').order('created_at',{ascending:false});
  if(error)throw error;
  const ids=(rows||[]).map(r=>r.id);
  convs=[];
  if(ids.length){
   const [msgs,mems,calls]=await Promise.all([
    client.from('messages').select('conversation_id,body,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).limit(400),
    Promise.all(ids.slice(0,40).map(id=>membersOf(id).catch(()=>({})))),
    client.from('vtg_calls').select('id,conversation_id,kind').in('conversation_id',ids).eq('status','active')
   ]);
   if(msgs.error)throw msgs.error;
   const latest={};(msgs.data||[]).forEach(m=>{if(!latest[m.conversation_id])latest[m.conversation_id]=m;});
   liveCalls={};(calls.data||[]).forEach(c=>{liveCalls[c.conversation_id]=c;});
   convs=rows.map((r,i)=>({...r,members:mems[i]||memberCache[r.id]||{},last_message:latest[r.id]?.body,last_at:latest[r.id]?.created_at||r.created_at}));
   convs.sort((a,b)=>new Date(b.last_at)-new Date(a.last_at));
  }
  renderList();
  if(activeId&&convs.some(c=>String(c.id)===activeId))refreshHeader();
 }catch(e){
  list.innerHTML='<div class="vtg-wa-empty">Chats could not be loaded: '+esc(e.message||'request failed')+'<br><br><button type="button" class="vtg-wa-sidebtn" data-refresh>Try again</button></div>';
 }
}
function refreshHeader(){
 const c=convs.find(x=>String(x.id)===activeId);if(!c)return;
 const t=convTitle(c),n=Object.keys(c.members||{}).length;
 titleEl.textContent=t;avatarEl.textContent=C.initials(t);
 subEl.textContent=n>2?n+' people · '+Object.values(c.members).map(m=>m.me?'You':m.name).join(', '):(Object.values(c.members).find(m=>!m.me)?.role?roleNames[Object.values(c.members).find(m=>!m.me).role]||'Trade partner':'Trade partner');
 const canCall=n>=2&&n<=5&&!!window.VTGCalls;voiceBtn.disabled=videoBtn.disabled=!canCall;
 const live=liveCalls[activeId];callbar.classList.toggle('show',!!live);
 if(live)$('[data-calltext]').textContent='A '+live.kind+' call is in progress in this chat.';
}
function toRows(rows){
 return rows.map(m=>{const mem=members[m.sender_id];return {id:m.id,senderId:m.sender_id,mine:String(m.sender_id)===String(userId),name:mem?.name||'Trade partner',tone:mem?.tone??0,text:m.body||'',at:m.created_at,pending:m.pending};});
}
function draw(){C.renderStream(log,toRows(messages),'No messages yet. Say hello below.');}
async function openConv(id){
 activeId=String(id);host.classList.add('is-open');renderList();empty(log,'Loading messages…');
 try{
  members=await membersOf(activeId);
  const c=convs.find(x=>String(x.id)===activeId);if(c)c.members=members;
  refreshHeader();
  const {data,error}=await client.from('messages').select('id,sender_id,body,created_at').eq('conversation_id',activeId).order('created_at',{ascending:true}).limit(500);
  if(error)throw error;
  messages=data||[];draw();
 }catch(e){empty(log,'Messages could not be loaded: '+(e.message||'request failed'));}
}
function listen(){
 if(channel)return;
 channel=client.channel('vtg-msgs-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async payload=>{
  const m=payload.new;if(!m)return;
  const c=convs.find(x=>String(x.id)===String(m.conversation_id));
  if(c){c.last_message=m.body;c.last_at=m.created_at;convs.sort((a,b)=>new Date(b.last_at)-new Date(a.last_at));renderList();}
  else loadList();
  if(String(m.conversation_id)===activeId&&!messages.some(x=>String(x.id)===String(m.id))){
   const pendingIdx=messages.findIndex(x=>x.pending&&x.body===m.body&&String(x.sender_id)===String(m.sender_id));
   if(pendingIdx>=0)messages.splice(pendingIdx,1);
   const hydrated=await hydrateAttachments([m]);messages.push(hydrated[0]||m);draw();
  }
 }).subscribe();
 callChannel=client.channel('vtg-calls-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'vtg_calls'},payload=>{
  const r=payload.new||payload.old||{};
  if(payload.eventType==='DELETE'||r.status==='ended')delete liveCalls[r.conversation_id];
  else if(r.status==='active'){liveCalls[r.conversation_id]=r;if(payload.eventType==='INSERT'&&String(r.started_by)!==String(userId))window.VTGCalls?.incoming?.(r,convTitleById(r.conversation_id));}
  renderList();if(String(r.conversation_id)===activeId)refreshHeader();
 }).subscribe();
}
function convTitleById(id){const c=convs.find(x=>String(x.id)===String(id));return c?convTitle(c):'Trade chat';}

/* ---- new chat picker */
async function showPicker(){
 picker.hidden=false;picker.className='vtg-wa-picker';picker.innerHTML='<h4>Start a chat</h4><small>Loading your trade partners…</small>';
 try{
  if(!client)await boot();
  const {data,error}=await client.rpc('vtg_chat_contacts');if(error)throw error;
  if(!data?.length){picker.innerHTML='<h4>Start a chat</h4><small>No trade partners are linked to your account yet. Partners appear here once you share an order or letter of credit.</small><div class="row"><button type="button" class="vtg-wa-sidebtn ghost" data-cancel>Close</button></div>';return;}
  picker.innerHTML='<h4>Start a chat</h4><small>Pick 1 partner, or up to 4 for a group (5 people max).</small>'
   +data.map(c=>'<label><input type="checkbox" value="'+esc(c.user_id)+'"><span>'+esc(c.display_name)+'<small>'+esc(roleNames[c.role]||c.role)+'</small></span></label>').join('')
   +'<input type="text" data-grouptitle maxlength="80" placeholder="Group name (optional)" hidden><div class="err" data-pickerr></div><div class="row"><button type="button" class="vtg-wa-sidebtn" data-start>Start chat</button><button type="button" class="vtg-wa-sidebtn ghost" data-cancel>Cancel</button></div>';
 }catch(e){picker.innerHTML='<h4>Start a chat</h4><div class="err">'+esc(e.message||'Contacts could not be loaded')+'</div><div class="row"><button type="button" class="vtg-wa-sidebtn ghost" data-cancel>Close</button></div>';}
}
picker.addEventListener('change',e=>{
 const boxes=[...picker.querySelectorAll('input[type=checkbox]')],on=boxes.filter(b=>b.checked);
 if(on.length>4){e.target.checked=false;picker.querySelector('[data-pickerr]').textContent='A chat can have at most 5 people including you.';return;}
 picker.querySelector('[data-pickerr]').textContent='';
 const gt=picker.querySelector('[data-grouptitle]');if(gt)gt.hidden=on.length<2;
});
picker.addEventListener('click',async e=>{
 if(e.target.closest('[data-cancel]')){picker.hidden=true;return;}
 if(!e.target.closest('[data-start]'))return;
 const ids=[...picker.querySelectorAll('input[type=checkbox]:checked')].map(b=>b.value),err=picker.querySelector('[data-pickerr]');
 if(!ids.length){err.textContent='Choose at least one partner.';return;}
 try{
  const title=picker.querySelector('[data-grouptitle]')?.value||null;
  const {data,error}=await client.rpc('vtg_open_conversation',{p_partner_ids:ids,p_title:title});if(error)throw error;
  picker.hidden=true;delete memberCache[data];await loadList();await openConv(data);
 }catch(ex){err.textContent=ex.message||'Chat could not be started';}
});

/* ---- sending */
function renderQueuedFiles(){
 pendingFiles.hidden=!queuedFiles.length;
 pendingFiles.innerHTML=queuedFiles.map((f,i)=>'<span>'+esc(f.name)+' <button type="button" data-remove-file="'+i+'" aria-label="Remove '+esc(f.name)+'">×</button></span>').join('');
}
$('[data-attach]').addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>{
 const incoming=[...fileInput.files];fileInput.value='';
 for(const file of incoming){
  if(queuedFiles.length>=8)break;
  if(file.size>100*1024*1024)continue;
  if(!/^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)|text\/(plain|csv)|image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/i.test(file.type))continue;
  if(!queuedFiles.some(x=>x.name===file.name&&x.size===file.size))queuedFiles.push(file);
 }
 renderQueuedFiles();
});
pendingFiles.addEventListener('click',e=>{const b=e.target.closest('[data-remove-file]');if(!b)return;queuedFiles.splice(Number(b.dataset.removeFile),1);renderQueuedFiles();});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const body=input.value.trim(),files=[...queuedFiles];if(!body&&!files.length)return;
 if(!activeId){empty(log,'Choose a chat first, or start a new one.');return;}
 if(body.length>4000)return;
 busy=true;sendBtn.disabled=true;input.value='';input.style.height='';queuedFiles=[];renderQueuedFiles();
 const temp={id:'tmp-'+Date.now(),sender_id:userId,body,created_at:new Date().toISOString(),pending:true};
 messages.push(temp);draw();
 const uploaded=[];
 try{
  for(const file of files){
   const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100)||'attachment';
   const path=activeId+'/'+userId+'/'+crypto.randomUUID()+'-'+clean;
   const {error:uploadError}=await client.storage.from('vtg-chat-attachments').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   uploaded.push({path,file});
  }
  const {data,error}=await client.from('messages').insert({conversation_id:activeId,sender_id:userId,body:body||' '}).select('id,sender_id,body,created_at').single();
  if(error)throw error;
  const records=uploaded.map(x=>({conversation_id:activeId,message_id:data.id,uploaded_by:userId,storage_path:x.path,original_name:x.file.name,mime_type:x.file.type,size_bytes:x.file.size,attachment_type:x.file.type.startsWith('image/')?'image':x.file.type.startsWith('video/')?'video':'document'}));
  if(records.length){const {error:ae}=await client.from('vtg_chat_attachments').insert(records);if(ae)throw ae;}
  const hydrated=await hydrateAttachments([data]);
  const i=messages.findIndex(x=>x.id===temp.id);if(i>=0)messages.splice(i,1);
  if(!messages.some(x=>String(x.id)===String(data.id)))messages.push(hydrated[0]||data);
  draw();loadList();
 }catch(err){
  for(const x of uploaded)await client.storage.from('vtg-chat-attachments').remove([x.path]).catch(()=>{});
  messages=messages.filter(x=>x.id!==temp.id);draw();input.value=body;queuedFiles=files;renderQueuedFiles();
  const note=document.createElement('div');note.className='vtg-wa-empty';note.textContent='Message or attachment not sent: '+(err.message||'request failed');log.append(note);log.scrollTop=log.scrollHeight;
 }finally{busy=false;sendBtn.disabled=false;input.focus();}
});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});

/* ---- calls */
function startCall(kind){
 if(!window.VTGCalls||!activeId)return;
 const c=convs.find(x=>String(x.id)===activeId);
 window.VTGCalls.start({client,userId,conversationId:activeId,kind,members,title:c?convTitle(c):'Trade chat'});
}
voiceBtn.addEventListener('click',()=>startCall('voice'));
videoBtn.addEventListener('click',()=>startCall('video'));
$('[data-joincall]').addEventListener('click',()=>{
 const live=liveCalls[activeId];if(!live||!window.VTGCalls)return;
 const c=convs.find(x=>String(x.id)===activeId);
 window.VTGCalls.start({client,userId,conversationId:activeId,kind:live.kind,members,title:c?convTitle(c):'Trade chat'});
});

host.addEventListener('click',e=>{
 const open=e.target.closest('[data-open]');if(open){openConv(open.dataset.open);return;}
 if(e.target.closest('[data-new]')){picker.hidden?showPicker():picker.hidden=true;return;}
 if(e.target.closest('[data-refresh]')){Object.keys(memberCache).forEach(k=>delete memberCache[k]);loadList();return;}
 if(e.target.closest('[data-back]')){host.classList.remove('is-open');}
});
window.VTGPeerMessages={refresh:loadList,open:openConv,openWithCall(conversationId){return openConv(conversationId);}};
empty(log,'Choose a chat to read its messages.');
const start=()=>loadList().then(()=>{if(client)listen();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
