/* VTG AI chat — WhatsApp-style. Your messages: right, blue. VTG AI: left. Shared by Buyer, Supplier and Bank dashboards. */
(function(){
'use strict';
const root=document.getElementById('vtg-ai-chat');if(!root||!window.VTGChat)return;
const C=window.VTGChat,I=C.icons;
const role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank'};
const preview=new URLSearchParams(location.search).get('preview')==='1';
root.innerHTML='<section class="vtg-wa vtg-wa-card" aria-label="VTG AI chat">'
 +'<header class="vtg-wa-head"><div class="vtg-wa-avatar ai">AI</div><div class="vtg-wa-title"><strong>VTG AI Trade Desk</strong><small>Trade guidance for your '+C.esc(roleNames[role]||'VTG')+' workspace</small></div></header>'
 +'<div class="vtg-wa-stream" id="vtgChatStream" role="log" aria-live="polite" aria-relevant="additions text"></div>'
 +'<form class="vtg-wa-compose" id="vtgChatForm"><textarea id="vtgChatInput" rows="1" maxlength="6000" placeholder="Message VTG AI" aria-label="Message VTG AI" required></textarea><button class="vtg-wa-send" id="vtgChatSend" type="submit" aria-label="Send message">'+I.send+'</button></form>'
 +'<div class="vtg-wa-note">VTG AI provides trade-preparation guidance, not bank approval, legal advice, customs clearance or independent verification. Do not share passwords or payment credentials.</div></section>';
const stream=root.querySelector('#vtgChatStream'),form=root.querySelector('#vtgChatForm'),input=root.querySelector('#vtgChatInput'),send=root.querySelector('#vtgChatSend');
const history=[];let busy=false,typingRow=null,seq=0;
function push(text,mine){history.push({id:++seq,mine,ai:!mine,name:'VTG AI',senderId:mine?'me':'ai',text,at:new Date()});draw();}
function draw(){
 C.renderStream(stream,history);
 if(typingRow){stream.append(typingRow);stream.scrollTop=stream.scrollHeight;}
}
function typing(on){
 if(!on){typingRow?.remove();typingRow=null;return;}
 typingRow=document.createElement('div');typingRow.className='vtg-wa-row is-other first';typingRow.dataset.tone='ai';
 typingRow.innerHTML='<div class="vtg-wa-bubble"><span class="vtg-wa-name">VTG AI</span><span class="vtg-wa-typing" aria-label="VTG AI is typing"><i></i><i></i><i></i></span></div>';
 stream.append(typingRow);stream.scrollTop=stream.scrollHeight;
}
push('Hello, I’m VTG AI. Ask me about sourcing, quotations, supplier readiness, trade documents, shipment planning or trade-finance preparation. I’ll separate general guidance from facts that need independent confirmation.',false);
async function ready(){
 const {client,userId}=await C.clientReady();
 const {data:profile,error}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
 if(error)throw error;
 if(!profile?.is_active||profile.role!==role)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required to use this assistant.');
 return client;
}
async function errorDetail(error){
 let detail=error?.message||'VTG AI could not complete this request.';
 try{const p=await error.context?.json?.();if(p?.error?.message)detail=p.error.message;else if(typeof p?.error==='string')detail=p.error;}catch(_){}
 return detail;
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const message=input.value.trim();if(!message)return;
 push(message,true);input.value='';input.style.height='';
 if(preview){push('Preview mode: sign in with an active VTG '+(roleNames[role]||'')+' account to use the live assistant. Your message was not sent.',false);return;}
 busy=true;send.disabled=true;typing(true);
 try{
  const client=await ready();
  const {data,error}=await client.functions.invoke('vtg-ai-assistant',{body:{message}});
  if(error)throw new Error(await errorDetail(error));
  if(data?.error)throw new Error(data.error.message||(typeof data.error==='string'?data.error:'VTG AI could not complete this request.'));
  if(typeof data?.reply!=='string'||!data.reply.trim())throw new Error('VTG AI returned an empty response. Please try again.');
  const fallback=data.mode==='fallback';
  typing(false);
  push(data.reply.trim()+(fallback?'\n\nService note: VTG AI could not reach its response provider, so this is not a trade recommendation. Please try again shortly.':''),false);
 }catch(error){
  typing(false);push(error?.message||'VTG AI is temporarily unavailable. Please try again.',false);
 }finally{busy=false;send.disabled=false;input.focus();}
});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
})();
