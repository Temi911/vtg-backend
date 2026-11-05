(function(){
'use strict';
const root=document.querySelector('[data-vtg-peer-chat]');if(!root)return;
const $=sel=>root.querySelector(sel),role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank',agent:'Trade agent'};
const list=$('[data-vtg-conversations]'),log=$('[data-vtg-log]'),form=$('[data-vtg-form]'),input=$('[data-vtg-input]'),title=$('[data-vtg-title]'),send=$('[data-vtg-send]');
let conversations=[],activeId='',busy=false,client=null,userId='',channel=null;
function placeholder(target,message){if(target)target.innerHTML='<div class="empty">'+esc(message)+'</div>'}
async function session(){
 const auth=await window.VTG_AUTH_READY;client=auth?.client||window.VTG_SUPABASE;
 if(!client?.auth)throw new Error('VTG account service is unavailable. Refresh and sign in again.');
 const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Sign in to view account conversations.');
 userId=data.session.user.id;
 const {data:profile,error:pe}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
 if(pe)throw pe;if(profile?.role!==role||profile?.is_active!==true)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required.');
 return data.session;
}
function renderList(){
 list.innerHTML=conversations.length?conversations.map(c=>'<button type="button" class="vtg-peer-thread '+(String(c.id)===String(activeId)?'active':'')+'" data-vtg-thread="'+esc(c.id)+'"><strong>'+esc(c.order_reference||'Trade conversation')+'</strong><small>'+esc(c.last_message||'No messages yet')+'</small></button>').join(''):'<div class="empty">No account conversations are linked to this workspace yet. A conversation appears when a supported trade workflow adds your account as a participant.</div>';
}
async function loadList(){
 placeholder(list,'Loading account conversations…');
 try{
  await session();
  const [created,participantRows]=await Promise.all([
   client.from('conversations').select('id,order_id,created_at').eq('created_by',userId),
   client.from('conversation_participants').select('conversation_id').eq('user_id',userId)
  ]);
  if(created.error)throw created.error;if(participantRows.error)throw participantRows.error;
  const ids=[...new Set([...(created.data||[]).map(x=>x.id),...(participantRows.data||[]).map(x=>x.conversation_id)])];
  if(!ids.length){conversations=[];activeId='';renderList();title.textContent='No conversation selected';placeholder(log,'Your account has no linked conversations yet.');return}
  const {data:rows,error}=await client.from('conversations').select('id,order_id,created_at').in('id',ids).order('created_at',{ascending:false});
  if(error)throw error;
  const orderIds=[...new Set((rows||[]).map(x=>x.order_id).filter(Boolean))];let orderMap={};
  if(orderIds.length){const {data:orders,error:oe}=await client.from('trade_orders').select('id,reference').in('id',orderIds);if(oe)throw oe;orderMap=Object.fromEntries((orders||[]).map(o=>[o.id,o.reference]));}
  const {data:messages,error:me}=await client.from('messages').select('conversation_id,body,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).limit(500);
  if(me)throw me;const latest={};(messages||[]).forEach(m=>{if(!latest[m.conversation_id])latest[m.conversation_id]=m;});
  conversations=(rows||[]).map(c=>({...c,order_reference:orderMap[c.order_id]||'General trade conversation',last_message:latest[c.id]?.body||'No messages yet'}));
  renderList();
  if(activeId&&conversations.some(c=>String(c.id)===String(activeId)))await loadMessages(activeId);
  else if(conversations.length)await loadMessages(conversations[0].id);
 }catch(e){placeholder(list,'Live conversations could not be loaded: '+(e.message||'Supabase request failed'));const b=document.createElement('button');b.type='button';b.className='vtg-peer-refresh';b.textContent='Try again';b.addEventListener('click',loadList);list.append(b);}
}
function watchConversation(id){
 if(channel){client.removeChannel(channel);channel=null;}
 channel=client.channel('vtg-chat-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+id},()=>loadMessages(id)).subscribe();
}
async function loadMessages(id){
 activeId=String(id);renderList();placeholder(log,'Loading messages…');
 try{
  await session();
  const {data:rows,error}=await client.from('messages').select('id,conversation_id,sender_id,body,created_at').eq('conversation_id',activeId).order('created_at',{ascending:true}).limit(500);
  if(error)throw error;
  const {data:roles,error:roleError}=await client.rpc('vtg_conversation_sender_roles',{p_conversation_id:activeId});
  const roleMap=!roleError?Object.fromEntries((roles||[]).map(x=>[x.user_id,String(x.role||'other').toLowerCase()])):{};
  log.innerHTML=rows?.length?rows.map(m=>{const mine=String(m.sender_id)===String(userId),senderRole=roleMap[m.sender_id]||'other';const label=mine?'You':(roleNames[senderRole]||'Trade partner');return '<div class="bubble '+(mine?'mine':'')+'" data-sender-role="'+esc(senderRole)+'">'+esc(m.body||'')+'<small>'+esc(label)+' · '+esc(m.created_at?new Date(m.created_at).toLocaleString():'')+'</small></div>';}).join(''):'<div class="empty">No messages in this conversation yet. You can send the first message below.</div>';
  const c=conversations.find(x=>String(x.id)===activeId);title.textContent=c?.order_reference||'Live trade conversation';log.scrollTop=log.scrollHeight;watchConversation(activeId);
 }catch(e){placeholder(log,'Messages could not be loaded: '+(e.message||'Supabase request failed'));}
}
list.addEventListener('click',e=>{const b=e.target.closest('[data-vtg-thread]');if(b)loadMessages(b.dataset.vtgThread);});
root.querySelector('[data-vtg-refresh]')?.addEventListener('click',loadList);
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const body=input.value.trim();if(!body)return;
 if(!activeId){placeholder(log,'There is no active conversation to receive this message yet.');return;}
 if(body.length>4000){placeholder(log,'Please keep messages under 4,000 characters.');return}
 busy=true;send.disabled=true;
 try{await session();const {error}=await client.from('messages').insert({conversation_id:activeId,sender_id:userId,body});if(error)throw error;input.value='';await Promise.all([loadMessages(activeId),loadList()]);}
 catch(err){placeholder(log,'Message was not sent: '+(err.message||'Supabase request failed'));}
 finally{busy=false;send.disabled=false;input.focus();}
});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
placeholder(list,'Sign in to load account conversations.');placeholder(log,'Choose a conversation to view its messages.');
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadList,{once:true});else loadList();
window.VTGPeerMessages={refresh:loadList,open:loadMessages};
})();