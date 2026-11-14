/* VTG AI chat — resilient mount for Buyer, Supplier and Bank dashboards. */
(function(){
'use strict';
function fallbackCore(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons={send:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>'};
 function renderStream(stream,msgs,emptyText,onEdit){
  stream.replaceChildren();
  if(!msgs.length){const e=document.createElement('div');e.className='vtg-wa-empty';e.textContent=emptyText||'No messages yet.';stream.append(e);return;}
  let previous='';
  msgs.forEach(msg=>{
   const key=(msg.mine?'me':'ai')+'|'+(msg.ai?'ai':'');
   const row=document.createElement('div');row.className='vtg-wa-row '+(msg.mine?'is-self':'is-other')+(key!==previous?' first':'');row.dataset.tone=msg.ai?'ai':'0';
   const bubble=document.createElement('div');bubble.className='vtg-wa-bubble';
   if(!msg.mine&&key!==previous){const name=document.createElement('span');name.className='vtg-wa-name';name.textContent=msg.name||'VTG AI';bubble.append(name);}
   const body=document.createElement('div');body.className='vtg-wa-text';body.textContent=msg.text||'';bubble.append(body);
   const meta=document.createElement('span');meta.className='vtg-wa-meta';meta.textContent=new Date(msg.at||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});bubble.append(meta);
   if(msg.mine&&msg.editable&&typeof onEdit==='function'){const edit=document.createElement('button');edit.type='button';edit.className='vtg-wa-edit';edit.textContent='Edit';edit.addEventListener('click',()=>onEdit(msg));bubble.append(edit);}
   row.append(bubble);stream.append(row);previous=key;
  });
  stream.scrollTop=stream.scrollHeight;
 }
 async function clientReady(){
  const auth=await window.VTG_AUTH_READY;
  const client=auth?.client||window.VTG_SUPABASE;
  if(!client?.auth)throw new Error('VTG sign-in service is unavailable. Refresh the dashboard and try again.');
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Please sign in to your VTG account first.');
  return {client,userId:data.session.user.id};
 }
 return {esc,icons,renderStream,clientReady};
}
function boot(){
 if(window.__VTG_AI_CHAT_MOUNTED)return;
 const root=document.getElementById('vtg-ai-chat');if(!root)return;
 window.__VTG_AI_CHAT_MOUNTED=true;
 const C=window.VTGChat||fallbackCore();window.VTGChat=window.VTGChat||C;
 const I=C.icons||fallbackCore().icons;
 const path=String(location.pathname||'').toLowerCase();
 const role=String(document.documentElement.dataset.vtgRole||document.body?.dataset?.vtgRole||(path.includes('supplier')?'supplier':path.includes('bank')?'bank':'buyer')).toLowerCase();
 const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank'};
 const preview=new URLSearchParams(location.search).get('preview')==='1';
 root.innerHTML='<section class="vtg-wa vtg-wa-card" aria-label="VTG AI chat">'
  +'<header class="vtg-wa-head"><div class="vtg-wa-avatar ai">AI</div><div class="vtg-wa-title"><strong>VTG AI Trade Desk</strong><small>Trade guidance for your '+C.esc(roleNames[role]||'VTG')+' workspace</small></div></header>'
  +'<div class="vtg-wa-stream" id="vtgChatStream" role="log" aria-live="polite" aria-relevant="additions text"></div>'
  +'<form class="vtg-wa-compose" id="vtgChatForm"><textarea id="vtgChatInput" rows="1" maxlength="6000" placeholder="Message VTG AI" aria-label="Message VTG AI"></textarea><button class="vtg-wa-send" id="vtgChatSend" type="submit" aria-label="Send message">'+I.send+'</button></form>'
  +'<div class="vtg-wa-note">VTG AI uses relevant information from your VTG workspace and your message to prepare responses. This information is sent to VTG\'s configured AI providers. Do not share passwords, payment credentials or authentication codes. VTG AI provides trade-preparation guidance, not bank approval, legal advice, customs clearance or independent verification.</div></section>';
 const stream=root.querySelector('#vtgChatStream'),form=root.querySelector('#vtgChatForm'),input=root.querySelector('#vtgChatInput'),send=root.querySelector('#vtgChatSend');
 const history=[];let busy=false,typingRow=null,seq=0;
 const picker=(window.VTGAttach&&C.bubbleRow)?(function(){try{return window.VTGAttach.mountPicker(form,'ai',note=>push(note,false));}catch(_){return null;}})():null;
 function push(text,mine,attachments){history.push({id:++seq,mine,ai:!mine,name:'VTG AI',senderId:mine?'me':'ai',text,at:new Date(),editable:mine&&!(attachments&&attachments.length),attachments:attachments&&attachments.length?attachments:null});draw();}
 function editMessage(msg){const index=history.findIndex(item=>item.id===msg.id);if(index<0)return;history.splice(index);input.value=msg.text;input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';draw();input.focus();input.setSelectionRange(input.value.length,input.value.length);}
 function draw(){C.renderStream(stream,history,undefined,editMessage);if(typingRow){stream.append(typingRow);stream.scrollTop=stream.scrollHeight;}}
 function typing(on){if(!on){typingRow?.remove();typingRow=null;return;}typingRow=document.createElement('div');typingRow.className='vtg-wa-row is-other first';typingRow.dataset.tone='ai';typingRow.innerHTML='<div class="vtg-wa-bubble"><span class="vtg-wa-name">VTG AI</span><span class="vtg-wa-typing" aria-label="VTG AI is typing"><i></i><i></i><i></i></span></div>';stream.append(typingRow);stream.scrollTop=stream.scrollHeight;}
 push('Hello, I’m VTG AI. Ask me about sourcing, quotations, supplier readiness, trade documents, shipment planning or trade-finance preparation. I’ll separate general guidance from facts that need independent confirmation.',false);
 async function ready(){const {client,userId}=await C.clientReady();const {data:profile,error}=await client.from('profiles').select('role,is_active').eq('id',userId).single();if(error)throw error;if(!profile?.is_active||profile.role!==role)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required to use this assistant.');return client;}
 async function errorDetail(error){let detail=error?.message||'VTG AI could not complete this request.';try{const p=await error.context?.json?.();if(p?.error?.message)detail=p.error.message;else if(typeof p?.error==='string')detail=p.error;}catch(_){}return detail;}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const typed=input.value.trim(),items=picker?picker.items():[];if(!typed&&!items.length)return;const message=typed||'Please read the attached file'+(items.length>1?'s':'')+' and summarise what matters for my trade.';
  push(typed,true,items.map(it=>({name:it.file.name,mime:it.mime,size:it.file.size,kind:it.kind,file:it.file})));input.value='';input.style.height='';if(picker)picker.clear();
  if(preview){push('Preview mode: sign in with an active VTG '+(roleNames[role]||'')+' account to use the live assistant. Your message was not sent.',false);return;}
  if(items.length&&!window.VTGAttach){push('File uploads are not available right now. Your message was not sent.',false);return;}
  busy=true;send.disabled=true;typing(true);
  try{
   const client=await ready();const context=history.slice(0,-1).slice(-8).filter(item=>item.text).map(item=>({role:item.mine?'user':'assistant',content:item.text}));
   let attachments=[];
   if(items.length){const {userId}=await C.clientReady();try{attachments=await window.VTGAttach.uploadForAI(client,userId,items);}catch(e){throw new Error('Your files could not be uploaded. '+(e.message||'Please try again.'));}}
   const {data,error}=await client.functions.invoke('vtg-ai-assistant',{body:{message,context,...(attachments.length?{attachments:attachments.map(a=>({path:a.path,name:a.name,mime:a.mime}))}:{})}});
   if(typeof data?.reply==='string'&&data.reply.trim()){const fallback=data.mode==='fallback'||Boolean(data.error)||Boolean(error);typing(false);push(data.reply.trim()+(fallback?'\n\nService note: VTG AI could not reach its response provider, so this is not a trade recommendation. Please try again shortly.':''),false);return;}
   if(error)throw new Error(await errorDetail(error));if(data?.error)throw new Error(data.error.message||(typeof data.error==='string'?data.error:'VTG AI could not complete this request.'));
   throw new Error('VTG AI returned an empty response. Please try again.');
  }catch(error){typing(false);push(error?.message||'VTG AI is temporarily unavailable. Please try again.',false);}
  finally{busy=false;send.disabled=false;input.focus();}
 });
 input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
