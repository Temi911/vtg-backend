/* VTG chat attachments — shared by the AI chat and the buyer/supplier/bank chats.
   Purely additive: if this file fails to load, both chats keep working as text-only. */
(function(){
'use strict';
if(window.VTGAttach)return;
const MB=1048576;
const EXT={pdf:'application/pdf',txt:'text/plain',csv:'text/csv',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'};
const LIMITS={chat:{bucket:'vtg-chat-attachments',max:25*MB},ai:{bucket:'vtg-ai-attachments',max:20*MB},count:5};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mimeOf(file){const ext=String(file.name||'').split('.').pop().toLowerCase();const t=String(file.type||'').toLowerCase();return (t&&Object.values(EXT).includes(t))?t:(EXT[ext]||'');}
function kindOf(mime){return mime.startsWith('image/')?'image':mime.startsWith('video/')?'video':mime?'document':'other';}
function size(n){return n>=MB?(n/MB).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';}
function safeName(n){return String(n||'file').normalize('NFKD').replace(/[^\w.\- ]+/g,'_').replace(/\s+/g,'_').replace(/^\.+/,'').slice(-90)||'file';}
function uuid(){return (crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}));}
/* Returns {ok:[{file,mime,kind}], errors:[string]} */
function check(files,scope,already){
 const lim=LIMITS[scope],ok=[],errors=[];
 for(const f of files){
  if(already+ok.length>=LIMITS.count){errors.push('At most '+LIMITS.count+' files per message.');break;}
  const mime=mimeOf(f);
  if(!mime){errors.push(f.name+': this file type is not supported. Use PDF, Word, Excel, TXT, CSV, JPG, PNG, WEBP, GIF, MP4, WEBM or MOV.');continue;}
  if(!f.size){errors.push(f.name+': the file is empty.');continue;}
  if(f.size>lim.max){errors.push(f.name+': larger than '+(lim.max/MB)+' MB ('+size(f.size)+').');continue;}
  ok.push({file:f,mime,kind:kindOf(mime)});
 }
 return {ok,errors};
}
async function upload(client,scope,path,item){
 const {error}=await client.storage.from(LIMITS[scope].bucket).upload(path,item.file,{contentType:item.mime,upsert:false});
 if(error)throw new Error(item.file.name+': '+(error.message||'upload failed'));
 return path;
}
/* AI: upload to <uid>/<uuid>-<name>, return [{path,name,mime,size,kind}] */
async function uploadForAI(client,userId,items){
 const out=[];
 for(const it of items){const path=userId+'/'+uuid()+'-'+safeName(it.file.name);await upload(client,'ai',path,it);out.push({path,name:it.file.name,mime:it.mime,size:it.file.size,kind:it.kind});}
 return out;
}
/* Chat: upload after the message exists, then insert metadata rows. Returns the inserted rows. */
async function attachToMessage(client,userId,conversationId,messageId,items){
 const rows=[];
 for(const it of items){
  const path=conversationId+'/'+userId+'/'+uuid()+'-'+safeName(it.file.name);
  await upload(client,'chat',path,it);
  rows.push({conversation_id:conversationId,message_id:messageId,uploaded_by:userId,storage_path:path,original_name:it.file.name.slice(0,255),mime_type:it.mime,size_bytes:it.file.size,attachment_type:it.kind});
 }
 if(!rows.length)return [];
 const {data,error}=await client.from('vtg_chat_attachments').insert(rows).select('id,message_id,conversation_id,storage_path,original_name,mime_type,size_bytes,attachment_type,created_at');
 if(error)throw error;return data||[];
}
const urlCache=new Map();
async function signedUrl(client,bucket,path){
 const k=bucket+'|'+path,hit=urlCache.get(k);if(hit&&hit.exp>Date.now())return hit.url;
 const {data,error}=await client.storage.from(bucket).createSignedUrl(path,3600);
 if(error||!data?.signedUrl)throw new Error('Attachment link could not be created');
 urlCache.set(k,{url:data.signedUrl,exp:Date.now()+50*60*1000});return data.signedUrl;
}
/* Renders attachments inside a bubble. att: [{name,mime,size,kind,path?,bucket?,file?}]; file => local preview (pending upload). */
function render(container,att,client){
 const wrap=document.createElement('div');wrap.className='vtg-wa-atts';
 att.forEach(a=>{
  const kind=a.kind||kindOf(a.mime||'');
  const box=document.createElement('div');box.className='vtg-wa-att vtg-wa-att-'+kind;
  const label='<span class="vtg-wa-att-name">'+esc(a.name)+'</span><span class="vtg-wa-att-size">'+esc(size(a.size||0))+'</span>';
  const resolve=()=>a.file?Promise.resolve(URL.createObjectURL(a.file)):signedUrl(client,a.bucket,a.path);
  if(kind==='image'){
   box.innerHTML='<img alt="'+esc(a.name)+'" loading="lazy">'+'<div class="vtg-wa-att-cap">'+label+'</div>';
   resolve().then(u=>{const img=box.querySelector('img');img.src=u;img.addEventListener('click',()=>window.open(u,'_blank','noopener'));}).catch(()=>{box.innerHTML='<div class="vtg-wa-att-file"><span class="vtg-wa-att-ico">IMG</span>'+label+'</div>';});
  }else if(kind==='video'){
   box.innerHTML='<video controls preload="metadata" playsinline></video><div class="vtg-wa-att-cap">'+label+'</div>';
   resolve().then(u=>{box.querySelector('video').src=u;}).catch(()=>{box.innerHTML='<div class="vtg-wa-att-file"><span class="vtg-wa-att-ico">VID</span>'+label+'</div>';});
  }else{
   const ext=String(a.name).split('.').pop().slice(0,4).toUpperCase();
   box.innerHTML='<a class="vtg-wa-att-file" href="#" rel="noopener"><span class="vtg-wa-att-ico">'+esc(ext)+'</span>'+label+'</a>';
   box.querySelector('a').addEventListener('click',async ev=>{ev.preventDefault();try{window.open(await resolve(),'_blank','noopener');}catch(e){alert(e.message);}});
  }
  wrap.append(box);
 });
 container.append(wrap);return wrap;
}
/* Composer tray: returns {el, files(), clear(), onChange}. Adds a paperclip button before the textarea. */
function mountPicker(form,scope,onProblem){
 const btn=document.createElement('button');btn.type='button';btn.className='vtg-wa-iconbtn vtg-wa-clip';btn.setAttribute('aria-label','Attach files');btn.title='Attach documents, photos or videos';
 btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>';
 const inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.hidden=true;inp.accept=Object.keys(EXT).map(e=>'.'+e).join(',');
 const tray=document.createElement('div');tray.className='vtg-wa-tray';tray.hidden=true;
 form.parentNode.insertBefore(tray,form);form.insertBefore(btn,form.firstChild);form.append(inp);
 let items=[];
 function draw(){
  tray.hidden=!items.length;tray.innerHTML='';
  items.forEach((it,i)=>{
   const chip=document.createElement('div');chip.className='vtg-wa-chip';
   chip.innerHTML='<span class="vtg-wa-att-ico">'+esc((it.kind==='image'?'IMG':it.kind==='video'?'VID':it.file.name.split('.').pop().slice(0,4).toUpperCase()))+'</span><span class="vtg-wa-chip-name">'+esc(it.file.name)+'</span><small>'+esc(size(it.file.size))+'</small><button type="button" aria-label="Remove '+esc(it.file.name)+'">×</button>';
   chip.querySelector('button').addEventListener('click',()=>{items.splice(i,1);draw();});
   tray.append(chip);
  });
 }
 function add(fileList){
  const {ok,errors}=check([...fileList],scope,items.length);
  items=items.concat(ok);draw();if(errors.length)onProblem(errors.join(' '));
 }
 btn.addEventListener('click',()=>inp.click());
 inp.addEventListener('change',()=>{add(inp.files);inp.value='';});
 form.addEventListener('paste',e=>{const fs=[...(e.clipboardData?.files||[])];if(fs.length){add(fs);}});
 return {items:()=>items.slice(),clear(){items=[];draw();},setDisabled(v){btn.disabled=v;}};
}
window.VTGAttach={LIMITS,check,uploadForAI,attachToMessage,render,mountPicker,signedUrl,kindOf,size};
})();
