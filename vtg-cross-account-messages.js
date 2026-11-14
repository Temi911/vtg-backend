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
 +'<form class="vtg-wa-compose" data-form><textarea data-input rows="1" maxlength="4000" placeholder="Type a message" aria-label="Type a message"></textarea><button class="vtg-wa-send" data-send type="submit" aria-label="Send message">'+I.send+'</button></form>'
 +'<div class="vtg-wa-note">Only people in a chat can read or send messages, and you can only chat with partners linked to your trade records. Do not share passwords, one-time codes or bank credentials.</div></div>';
const $=s=>host.querySelector(s);
const list=$('[data-list]'),log=$('[data-log]'),form=$('[data-form]'),input=$('[data-input]'),sendBtn=$('[data-send]'),picker=$('[data-picker]');
const titleEl=$('[data-title]'),subEl=$('[data-sub]'),avatarEl=$('[data-avatar]'),voiceBtn=$('[data-voice]'),videoBtn=$('[data-video]'),callbar=$('[data-callbar]');
const ATT='[Attachment]',attMap={};
let picker2=null;
let client=null,userId='',convs=[],activeId='',members={},messages=[],busy=false,channel=null,callChannel=null,liveCalls={};
const memberCache={};
picker2=window.VTGAttach?(function(){try{return window.VTGAttach.mountPicker(form,'chat',note=>flash(note));}catch(_){return null;}})():null;
function flash(text){const n=document.createElement('div');n.className='vtg-wa-empty';n.textContent=text;log.append(n);log.scrollTop=log.scrollHeight;}
function addAtt(a){const list=attMap[a.message_id]||(attMap[a.message_id]=[]);if(!list.some(x=>x.id===a.id))list.push({id:a.id,name:a.original_name,mime:a.mime_type,size:a.size_bytes,kind:a.attachment_type,path:a.storage_path,bucket:'vtg-chat-attachments'});}
async function loadAtts(id){try{const {data,error}=await client.from('vtg_chat_attachments').select('id,message_id,storage_path,original_name,mime_type,size_bytes,attachment_type').eq('conversation_id',id).limit(500);if(!error)(data||[]).forEach(addAtt);}catch(_){}}

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
 return rows.map(m=>{const mem=members[m.sender_id];const att=m.localAtt||attMap[m.id]||null;const ph=m.body===ATT;return {id:m.id,senderId:m.sender_id,mine:String(m.sender_id)===String(userId),name:mem?.name||'Trade partner',tone:mem?.tone??0,text:ph?(att&&att.length?'':'Sending attachment…'):(m.body||''),attachments:att,client,at:m.created_at,pending:m.pending};});
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
  messages=data||[];await loadAtts(activeId);draw();
 }catch(e){empty(log,'Messages could not be loaded: '+(e.message||'request failed'));}
}
function listen(){
 if(channel)return;
 client.channel('vtg-atts-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'vtg_chat_attachments'},p=>{const a=p.new;if(!a)return;addAtt(a);if(String(a.conversation_id)===activeId)draw();}).subscribe();
 channel=client.channel('vtg-msgs-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
  const m=payload.new;if(!m)return;
  const c=convs.find(x=>String(x.id)===String(m.conversation_id));
  if(c){c.last_message=m.body===ATT?'Attachment':m.body;c.last_at=m.created_at;convs.sort((a,b)=>new Date(b.last_at)-new Date(a.last_at));renderList();}
  else loadList();
  if(String(m.conversation_id)===activeId&&!messages.some(x=>String(x.id)===String(m.id))){
   const pendingIdx=messages.findIndex(x=>x.pending&&x.body===m.body&&String(x.sender_id)===String(m.sender_id));
   if(pendingIdx>=0)messages.splice(pendingIdx,1);
   messages.push(m);draw();
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
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const typed=input.value.trim(),items=picker2?picker2.items():[];if(!typed&&!items.length)return;const body=typed||ATT;
 if(!activeId){empty(log,'Choose a chat first, or start a new one.');return;}
 if(body.length>4000){return;}
 busy=true;sendBtn.disabled=true;input.value='';input.style.height='';
 const temp={id:'tmp-'+Date.now(),sender_id:userId,body,created_at:new Date().toISOString(),pending:true,localAtt:items.length?items.map(it=>({name:it.file.name,mime:it.mime,size:it.file.size,kind:it.kind,file:it.file})):null};
 if(picker2)picker2.clear();
 messages.push(temp);draw();
 try{
  const {data,error}=await client.from('messages').insert({conversation_id:activeId,sender_id:userId,body}).select('id,sender_id,body,created_at').single();
  if(error)throw error;
  const i=messages.findIndex(x=>x.id===temp.id);
  if(i>=0){if(messages.some(x=>String(x.id)===String(data.id)))messages.splice(i,1);else messages[i]=data;}else if(!messages.some(x=>String(x.id)===String(data.id)))messages.push(data);
  draw();
  if(items.length){try{const rows=await window.VTGAttach.attachToMessage(client,userId,activeId,data.id,items);rows.forEach(addAtt);draw();}catch(ae){flash('Your message was sent, but the files could not be attached: '+(ae.message||'upload failed'));}}
 }catch(err){
  messages=messages.filter(x=>x.id!==temp.id);draw();input.value=typed;if(picker2&&items.length)flash('Files were not sent. Please attach them again.');
  const note=document.createElement('div');note.className='vtg-wa-empty';note.textContent='Message not sent: '+(err.message||'request failed');log.append(note);log.scrollTop=log.scrollHeight;
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
