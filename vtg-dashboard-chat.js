(function(){
'use strict';
const root=document.getElementById('vtg-ai-chat');if(!root)return;
const role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank'};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=s=>String(s||'VTG').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
root.innerHTML='<section class="vtg-chat-card" aria-label="VTG AI chat"><header class="vtg-chat-top"><div class="vtg-chat-mark">AI</div><div class="vtg-chat-heading"><strong>VTG AI Trade Desk</strong><small>Trade guidance for your '+escapeHTML(roleNames[role]||'VTG')+' workspace</small></div><span class="vtg-chat-status">Assistant</span></header><div class="vtg-chat-stream" id="vtgChatStream" role="log" aria-live="polite" aria-relevant="additions text"></div><form class="vtg-chat-compose" id="vtgChatForm"><textarea id="vtgChatInput" rows="1" maxlength="6000" placeholder="Message VTG AI…" aria-label="Message VTG AI" required></textarea><button class="vtg-chat-send" id="vtgChatSend" type="submit">Send</button></form><div class="vtg-chat-note">VTG AI provides trade-preparation guidance, not bank approval, legal advice, customs clearance or independent verification. Do not share passwords or payment credentials.</div></section>';
const stream=root.querySelector('#vtgChatStream'),form=root.querySelector('#vtgChatForm'),input=root.querySelector('#vtgChatInput'),send=root.querySelector('#vtgChatSend');
function addBubble({text,kind='ai',label='VTG AI',role:senderRole='ai',time=new Date()}){
 const row=document.createElement('div');row.className='vtg-chat-row'+(kind==='self'?' is-self':'')+(kind==='ai'?' is-ai':'');row.dataset.senderRole=senderRole;
 const avatar=document.createElement('div');avatar.className='vtg-chat-avatar';avatar.textContent=kind==='ai'?'AI':initials(label);
 const bubble=document.createElement('div');bubble.className='vtg-chat-bubble';bubble.textContent=text;
 const meta=document.createElement('div');meta.className='vtg-chat-meta';
 const who=document.createElement('span');who.className='vtg-chat-label';who.textContent=label;
 const stamp=document.createElement('span');stamp.textContent=time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
 meta.append(who,stamp);bubble.append(meta);row.append(avatar,bubble);stream.append(row);stream.scrollTop=stream.scrollHeight;return row;
}
function typing(){const row=document.createElement('div');row.className='vtg-chat-row is-ai';row.innerHTML='<div class="vtg-chat-avatar">AI</div><div class="vtg-chat-bubble"><span class="vtg-chat-typing" aria-label="VTG AI is typing"><i></i><i></i><i></i></span><div class="vtg-chat-meta"><span class="vtg-chat-label">VTG AI</span><span>Thinking…</span></div></div>';stream.append(row);stream.scrollTop=stream.scrollHeight;return row;}
addBubble({text:'Hello. I’m VTG AI. Ask me about sourcing, quotations, supplier readiness, trade documents, shipment planning or trade-finance preparation. I’ll distinguish general guidance from facts that need independent confirmation.',kind:'ai'});
let busy=false;
async function getClient(){
 const auth=await window.VTG_AUTH_READY;
 const client=auth?.client||window.VTG_SUPABASE;
 if(!client?.auth)throw new Error('VTG sign-in service is unavailable. Refresh the dashboard and try again.');
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session)throw new Error('Please sign in to your VTG account before using the AI assistant.');
 const {data:profile,error:profileError}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();
 if(profileError)throw profileError;
 if(!profile?.is_active||profile.role!==role)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required to use this assistant.');
 return client;
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const message=input.value.trim();if(!message)return;
 busy=true;send.disabled=true;input.disabled=true;
 addBubble({text:message,kind:'self',label:'You',role:role});
 input.value='';const pending=typing();
 try{
  const client=await getClient();
  const {data,error}=await client.functions.invoke('vtg-ai-assistant',{body:{message}});
  if(error)throw new Error(error.message||'VTG AI could not complete this request.');
  // The Edge Function may return a user-safe fallback reply together with
  // an error object describing the unavailable upstream provider. Display
  // that reply instead of discarding it as a failed request.
  if(typeof data?.reply==='string'&&data.reply.trim()){
   const fallback=data.mode==='fallback'||Boolean(data.error);
   const statusNote=fallback
    ? '\n\nService status: '+(data.error?.message||'The AI response provider is temporarily unavailable.')+' Your message was not submitted as a trade instruction. Please try again later.'
    : '';
   pending.remove();
   addBubble({text:data.reply.trim()+statusNote,kind:'ai',label:'VTG AI',role:'ai'});
   return;
  }
  if(data?.error)throw new Error(data.error.message||'VTG AI could not complete this request.');
  throw new Error('VTG AI returned an empty response. Please try again.');
 }catch(error){
  pending.remove();addBubble({text:error?.message||'VTG AI is temporarily unavailable. Please try again.',kind:'ai',label:'VTG AI',role:'ai'});
 }finally{busy=false;send.disabled=false;input.disabled=false;input.focus();}
});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
})();