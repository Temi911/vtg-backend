(function(){
'use strict';
const root=document.querySelector('[data-vtg-peer-chat]');if(!root)return;
const $=sel=>root.querySelector(sel),role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank',agent:'Trade agent'};
const list=$('[data-vtg-conversations]'),log=$('[data-vtg-log]'),form=$('[data-vtg-form]'),input=$('[data-vtg-input]'),title=$('[data-vtg-title]'),send=$('[data-vtg-send]');
let conversations=[],activeId='',busy=false,client=null,userId='';
function token(){try{return localStorage.getItem('vtg_access_token')||JSON.parse(localStorage.getItem('vtg-auth')||'{}').accessToken||''}catch(_){return ''}}
function placeholder(target,message){target.innerHTML='<div class="empty">'+esc(message)+'</div>'}
async function session(){
 const auth=await window.VTG_AUTH_READY;client=auth?.client||window.VTG_SUPABASE;
 if(!client?.auth)throw new Error('VTG account service is unavailable. Refresh and sign in again.');
 const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Sign in to view account conversations.');
 userId=data.session.user.id;
 const {data:profile,error:pe}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
 if(pe)throw pe;if(profile?.role!==role||profile?.is_active!==true)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required.');
 return data.session;
}
async function api(path,options={}){
 const t=token();const res=await fetch(path,{...options,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),Authorization:'Bearer '+t,...(options.headers||{})},cache:'no-store'});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error?.message||data.message||'Messaging request failed ('+res.status+').');return data;
}
function renderList(){
 list.innerHTML=conversations.length?conversations.map(c=>'<button type="button" class="vtg-peer-thread '+(String(c.id)===String(activeId)?'active':'')+'" data-vtg-thread="'+esc(c.id)+'"><strong>'+esc(c.order_reference||'Trade conversation')+'</strong><small>'+esc(c.last_message||'No messages yet')+(Number(c.unread_count||0)?' · '+Number(c.unread_count)+' unread':'')+'</small></button>').join(''):'<div class="empty">No account conversations are linked to this workspace yet. A conversation appears when a supported trade workflow adds your account as a participant.</div>';
}
async function loadList(){
 placeholder(list,'Loading account conversations…');
 if(new URLSearchParams(location.search).get('preview')==='1'){placeholder(list,'Preview mode: sign in to view account-linked conversations.');return;}
 try{await session();const d=await api('/api/messages');conversations=Array.isArray(d.conversations)?d.conversations:[];renderList();if(activeId&&conversations.some(c=>String(c.id)===String(activeId)))await loadMessages(activeId);else if(conversations.length)await loadMessages(conversations[0].id);else{activeId='';title.textContent='No conversation selected';placeholder(log,'Select an account conversation when one becomes available.');}}
 catch(e){placeholder(list,e.message+' ');const b=document.createElement('button');b.type='button';b.className='vtg-peer-refresh';b.textContent='Try again';b.addEventListener('click',loadList);list.append(b);}
}
async function loadMessages(id){
 activeId=String(id);renderList();placeholder(log,'Loading messages…');
 try{
  await session();const d=await api('/api/messages/'+encodeURIComponent(activeId)+'/messages');const rows=Array.isArray(d.messages)?d.messages:[];
  let roles={};try{const r=await client.rpc('vtg_conversation_sender_roles',{p_conversation_id:activeId});if(!r.error)roles=Object.fromEntries((r.data||[]).map(x=>[x.user_id,String(x.role||'other').toLowerCase()]));}catch(_){}
  log.innerHTML=rows.length?rows.map(m=>{const mine=String(m.sender_id)===String(userId),senderRole=roles[m.sender_id]||'other',label=mine?'You':(roleNames[senderRole]||'Trade partner');return '<div class="bubble '+(mine?'mine':'')+'" data-sender-role="'+esc(senderRole)+'">'+esc(m.body||'')+'<small>'+esc(label)+' · '+esc(m.created_at?new Date(m.created_at).toLocaleString():'')+'</small></div>';}).join(''):'<div class="empty">No messages in this conversation yet. You can send the first message below.</div>';
  const c=conversations.find(x=>String(x.id)===activeId);title.textContent=c?.order_reference||'Live trade conversation';log.scrollTop=log.scrollHeight;
 }catch(e){placeholder(log,'Messages could not be loaded: '+e.message);}
}
list.addEventListener('click',e=>{const b=e.target.closest('[data-vtg-thread]');if(b)loadMessages(b.dataset.vtgThread);});
root.querySelector('[data-vtg-refresh]')?.addEventListener('click',loadList);
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const body=input.value.trim();if(!body)return;
 if(!activeId){placeholder(log,'There is no active conversation to receive this message yet.');return;}
 busy=true;send.disabled=true;
 try{await session();await api('/api/messages/'+encodeURIComponent(activeId)+'/messages',{method:'POST',body:JSON.stringify({body})});input.value='';await Promise.all([loadMessages(activeId),loadList()]);}
 catch(err){placeholder(log,'Message was not sent: '+err.message);}
 finally{busy=false;send.disabled=false;input.focus();}
});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
placeholder(list,'Sign in to load account conversations.');placeholder(log,'Choose a conversation to view its messages.');
if(new URLSearchParams(location.search).get('preview')!=='1')loadList();
window.VTGPeerMessages={refresh:loadList,open:loadMessages};
})();