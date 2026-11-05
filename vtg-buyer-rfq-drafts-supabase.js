(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const preview=false;
 let client=null,buyerId=null,drafts=[];
 function setNotice(message,error=false){const n=$('rfqForm')?.querySelector('.notice');if(n){n.textContent=message;n.style.color=error?'var(--danger, #b42318)':'';}}
 async function session(){
  const auth=await window.VTG_AUTH_READY;
  if(!auth?.client)throw new Error('Secure sign-in is not ready. Refresh and try again.');
  const {data,error}=await auth.client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Sign in to save RFQ drafts to your VTG account. Preview mode drafts stay in this browser.');
  const {data:p,error:pe}=await auth.client.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();
  if(pe)throw pe;if(p.role!=='buyer'||!p.is_active)throw new Error('An active buyer account is required to save RFQ drafts.');
  client=auth.client;buyerId=data.session.user.id;
 }
 function render(){
  const rows=$('rfqRows'),total=$('rfqTotal'),count=$('rfqCount'),stat=$('statRfqs');
  if(total)total.textContent=String(drafts.length);if(count)count.textContent=String(drafts.length);if(stat)stat.textContent=String(drafts.length);
  if(!rows)return;
  rows.innerHTML=drafts.length?drafts.map(d=>'<div class="row"><div class="rowMain"><strong>'+esc(d.product)+'</strong><p>'+esc(d.quantity)+' units · '+esc(d.sourcing_country)+' → '+esc(d.destination)+'<br>Account draft · '+new Date(d.created_at).toLocaleDateString()+'</p>'+(d.specifications?'<p>'+esc(d.specifications)+'</p>':'')+'<p><span class="chip">Private draft · not sent to suppliers</span></p><button class="btn" type="button" data-account-rfq-id="'+esc(d.id)+'">Remove</button></div></div>').join(''):'<div class="empty">No saved RFQ drafts yet. Save a sourcing brief to keep it in your VTG account.</div>';
 }
 async function load(){
  if(preview){setNotice('Saved in this browser only in preview mode. Not sent to suppliers.');return;}
  try{
   await session();
   const {data,error}=await client.from('buyer_rfq_drafts').select('id,product,sourcing_country,quantity,destination,specifications,created_at,updated_at').eq('buyer_id',buyerId).order('created_at',{ascending:false});
   if(error)throw error;drafts=data||[];setNotice('Saved to your VTG buyer account across devices. Drafts are private and are not sent to suppliers.');render();
  }catch(e){setNotice((e?.message||'Could not load RFQ drafts.')+' Try refreshing the page.',true);}
 }
 async function save(form){
  const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{
   await session();
   const v=Object.fromEntries(new FormData(form));
   const payload={buyer_id:buyerId,product:String(v.product||'').trim(),sourcing_country:String(v.origin||''),quantity:Number(v.quantity),destination:String(v.destination||''),specifications:String(v.details||'').trim()||null};
   if(!payload.product||!Number.isFinite(payload.quantity)||payload.quantity<=0)throw new Error('Enter a product and a quantity greater than zero.');
   const {error}=await client.from('buyer_rfq_drafts').insert(payload);if(error)throw error;
   form.reset();await load();if(typeof window.say==='function')window.say('RFQ draft saved to your VTG account. It has not been sent to suppliers.');
  }catch(e){setNotice(e?.message||'Could not save this RFQ draft.',true);}
  finally{if(button)button.disabled=false;}
 }
 async function remove(id,button){
  if(button)button.disabled=true;
  try{await session();const {error}=await client.from('buyer_rfq_drafts').delete().eq('id',id).eq('buyer_id',buyerId);if(error)throw error;await load();}
  catch(e){setNotice(e?.message||'Could not remove this draft.',true);}
  finally{if(button)button.disabled=false;}
 }
 $('rfqForm')?.addEventListener('submit',e=>{
  if(preview)return;
  e.preventDefault();e.stopImmediatePropagation();save(e.currentTarget);
 },true);
 $('rfqRows')?.addEventListener('click',e=>{const b=e.target.closest('[data-account-rfq-id]');if(b)remove(b.getAttribute('data-account-rfq-id'),b);});
 window.VTGBuyerRfqDrafts={load,save,remove};load();
})();