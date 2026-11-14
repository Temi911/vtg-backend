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
 +'<div class="vtg-wa-file-pending" id="vtgAIPendingFiles" hidden></div><form class="vtg-wa-compose" id="vtgChatForm"><input type="file" id="vtgAIFileInput" multiple hidden accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,application/pdf,text/plain,text/csv,image/*,video/*"><button type="button" class="vtg-wa-attach" id="vtgAIAttach" aria-label="Attach files" title="Attach files">'+I.plus+'</button><textarea id="vtgChatInput" rows="1" maxlength="6000" placeholder="Message VTG AI or attach files" aria-label="Message VTG AI"></textarea><button class="vtg-wa-send" id="vtgChatSend" type="submit" aria-label="Send message">'+I.send+'</button></form>
 +'<div class="vtg-wa-note">VTG AI uses relevant information from your VTG workspace and your message to prepare responses. Files you attach are also processed for your request. PDFs, Word and Excel files, images and short videos are supported within file-size limits; scanned PDFs may need OCR. This information is sent to VTG's configured AI providers. Do not share passwords, payment credentials or authentication codes. VTG AI provides trade-preparation guidance, not bank approval, legal advice, customs clearance or independent verification.</div></section>';
const stream=root.querySelector('#vtgChatStream'),form=root.querySelector('#vtgChatForm'),input=root.querySelector('#vtgChatInput'),send=root.querySelector('#vtgChatSend'),fileInput=root.querySelector('#vtgAIFileInput'),attachBtn=root.querySelector('#vtgAIAttach'),pendingFiles=root.querySelector('#vtgAIPendingFiles');
const history=[];let busy=false,typingRow=null,seq=0,activeClient=null,activeUserId='',queuedFiles=[];
function push(text,mine,attachments=[]){history.push({id:++seq,mine,ai:!mine,name:'VTG AI',senderId:mine?'me':'ai',text,at:new Date(),editable:mine,attachments});draw();}
function editMessage(msg){
 const index=history.findIndex(item=>item.id===msg.id);
 if(index<0)return;
 history.splice(index);
 input.value=msg.text;
 input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';
 draw();input.focus();input.setSelectionRange(input.value.length,input.value.length);
}
function draw(){
 C.renderStream(stream,history,undefined,editMessage);
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
 activeClient=client;activeUserId=userId;return client;
}
async function errorDetail(error){
 let detail=error?.message||'VTG AI could not complete this request.';
 try{const p=await error.context?.json?.();if(p?.error?.message)detail=p.error.message;else if(typeof p?.error==='string')detail=p.error;}catch(_){}
 return detail;
}
function renderQueuedFiles(){
 pendingFiles.hidden=!queuedFiles.length;
 pendingFiles.innerHTML=queuedFiles.map((f,i)=>'<span>'+C.esc(f.name)+' <button type="button" data-remove-ai-file="'+i+'" aria-label="Remove '+C.esc(f.name)+'">×</button></span>').join('');
}
attachBtn.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>{
 const allowed=/^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)|text\/(plain|csv)|image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/i;
 for(const file of [...fileInput.files]){
  if(queuedFiles.length>=5)break;
  const limit=file.type.startsWith('video/')?15*1024*1024:file.type.startsWith('image/')?10*1024*1024:25*1024*1024;\n  if(file.size>limit||!allowed.test(file.type))continue;
  if(!queuedFiles.some(x=>x.name===file.name&&x.size===file.size))queuedFiles.push(file);
 }
 fileInput.value='';renderQueuedFiles();
});
pendingFiles.addEventListener('click',e=>{const b=e.target.closest('[data-remove-ai-file]');if(!b)return;queuedFiles.splice(Number(b.dataset.removeAiFile),1);renderQueuedFiles();});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const message=input.value.trim(),files=[...queuedFiles];if(!message&&!files.length)return;
 if(preview){push(message||'Please analyse these attachments.',true);push('Preview mode: sign in with an active VTG '+(roleNames[role]||'')+' account to use the live assistant. Your message was not sent.',false);return;}
 busy=true;send.disabled=true;input.value='';input.style.height='';queuedFiles=[];renderQueuedFiles();typing(true);
 try{
  const client=await ready(),attachmentIds=[],visibleAttachments=[];
  for(const file of files){
   const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100)||'attachment';
   const path=activeUserId+'/'+crypto.randomUUID()+'-'+clean;
   const {error:uploadError}=await client.storage.from('vtg-ai-attachments').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const kind=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':'document';
   const {data:record,error:recordError}=await client.from('vtg_ai_attachments').insert({owner_id:activeUserId,storage_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size,attachment_type:kind,processing_status:'uploaded'}).select('id').single();
   if(recordError)throw recordError;
   attachmentIds.push(record.id);
   const {data:signed}=await client.storage.from('vtg-ai-attachments').createSignedUrl(path,3600);
   visibleAttachments.push({original_name:file.name,mime_type:file.type,signed_url:signed?.signedUrl||''});
  }
  const prompt=message||(files.length?'Please review the attached files and explain the important information.':'');
  push(prompt,true,visibleAttachments);
  const context=history.slice(0,-1).slice(-8).map(item=>({role:item.mine?'user':'assistant',content:item.text}));
  const {data,error}=await client.functions.invoke('vtg-ai-assistant',{body:{message:prompt,context,attachmentIds}});
  if(typeof data?.reply==='string'&&data.reply.trim()){
   const fallback=data.mode==='fallback'||Boolean(data.error)||Boolean(error);typing(false);
   push(data.reply.trim()+(fallback?'\n\nService note: VTG AI could not reach its response provider, so this is not a trade recommendation. Please try again shortly.':''),false);return;
  }
  if(error)throw new Error(await errorDetail(error));
  if(data?.error)throw new Error(data.error.message||(typeof data.error==='string'?data.error:'VTG AI could not complete this request.'));
  throw new Error('VTG AI returned an empty response. Please try again.');
 }catch(error){
  typing(false);queuedFiles=files;renderQueuedFiles();push(error?.message||'VTG AI is temporarily unavailable. Please try again.',false);
 }finally{typing(false);busy=false;send.disabled=false;input.focus();}
});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
})();
