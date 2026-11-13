(function(){
 'use strict';
 const BUCKET='vtg-supplier-documents',MAX=10*1024*1024,TYPES={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,busy=false;
 function say(msg,bad){const n=$('supplierDocNotice');if(n){n.textContent=msg;n.className='notice'+(bad?' error':'');n.hidden=!msg}}
 async function context(){
  if(ctx)return ctx;
  let auth;try{auth=await window.VTG_AUTH_READY}catch(_){auth={client:window.VTG_SUPABASE}}
  const client=auth?.client||window.VTG_SUPABASE;if(!client)throw new Error('VTG secure sign-in service is unavailable. Refresh and try again.');
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Sign in with your supplier account to manage document files.');
  const {data:p,error:pe}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
  if(pe)throw pe;if(!p||p.role!=='supplier'||!p.is_active)throw new Error('An active supplier account is required.');
  ctx={client,userId:data.session.user.id};return ctx;
 }
 const slug=s=>String(s||'document').toLowerCase().replace(/\.[a-z0-9]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'document';
 const size=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
 async function load(){
  const host=$('supplierDocFiles');if(!host)return;
  try{
   const {client,userId}=await context();
   const {data,error}=await client.storage.from(BUCKET).list(userId,{limit:100,sortBy:{column:'created_at',order:'desc'}});
   if(error)throw error;
   const files=(data||[]).filter(f=>f.name&&f.id);
   host.innerHTML=files.length?files.map(f=>'<article class="record-card"><strong>'+esc(f.name.replace(/^\d+-/,''))+'</strong><p class="small muted">'+esc(size(f.metadata?.size||0))+' · '+esc(new Date(f.created_at||Date.now()).toLocaleDateString())+'</p><div class="actions"><button class="btn" type="button" data-doc-open="'+esc(f.name)+'">Open</button> <button class="btn danger" type="button" data-doc-del="'+esc(f.name)+'">Delete</button></div></article>').join(''):'<div class="empty">No document files uploaded yet.</div>';
  }catch(e){host.innerHTML='<div class="empty">Unable to load your documents.</div>';say(e.message||'Unable to load your documents.',true)}
 }
 async function upload(ev){
  ev.preventDefault();if(busy)return;
  const f=ev.currentTarget,file=f.elements.file?.files?.[0],label=f.elements.label?.value||'';
  if(!file){say('Choose a PDF, JPEG, PNG or WEBP file.',true);return}
  if(!TYPES[file.type]){say('Only PDF, JPEG, PNG or WEBP files are accepted.',true);return}
  if(file.size>MAX){say('Files must be 10 MB or smaller.',true);return}
  busy=true;const btn=f.querySelector('button[type=submit]');if(btn)btn.disabled=true;say('Uploading…');
  try{
   const {client,userId}=await context();
   const path=userId+'/'+Date.now()+'-'+slug(label||file.name)+'.'+TYPES[file.type];
   const r=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(r.error)throw r.error;
   f.reset();say('Document uploaded. It is private to your supplier account.');await load();
  }catch(e){say(e.message||'Upload failed.',true)}
  finally{busy=false;if(btn)btn.disabled=false}
 }
 async function act(ev){
  const o=ev.target.closest('[data-doc-open]'),d=ev.target.closest('[data-doc-del]');if(!o&&!d)return;
  try{
   const {client,userId}=await context();
   if(o){const w=window.open('','_blank');const r=await client.storage.from(BUCKET).createSignedUrl(userId+'/'+o.dataset.docOpen,120);if(r.error){w?.close();throw r.error}if(w)w.location.href=r.data.signedUrl;return}
   if(!confirm('Delete this document file? This cannot be undone.'))return;
   const r=await client.storage.from(BUCKET).remove([userId+'/'+d.dataset.docDel]);if(r.error)throw r.error;await load();
  }catch(e){say(e.message||'Action failed.',true)}
 }
 document.addEventListener('DOMContentLoaded',()=>{$('supplierDocForm')?.addEventListener('submit',upload);$('supplierDocFiles')?.addEventListener('click',act);setTimeout(load,0)});
})();
