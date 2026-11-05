(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const form=$('liveProductForm'),toggle=$('liveProductToggle'),rows=$('liveProductRows'),notice=$('liveCatalogueNotice');
if(!form||!toggle||!rows||!notice)return;
const preview=new URLSearchParams(location.search).get('preview')==='1';
let db=null,user=null,profile=null,products=[];
function say(message){notice.textContent=message;}
function money(value,currency){return esc(currency||'USD')+' '+Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
async function connect(){
 const auth=await window.VTG_AUTH_READY;
 const result=await auth.client.auth.getSession();
 if(result.error)throw result.error;
 if(!result.data.session)throw new Error('Sign in with your supplier account to manage live catalogue products.');
 db=auth.client;user=result.data.session.user;
 const p=await db.from('profiles').select('role,is_active,full_name,country').eq('id',user.id).single();
 if(p.error)throw p.error;
 if(p.data.role!=='supplier'||!p.data.is_active)throw new Error('An active supplier account is required to publish products.');
 profile=p.data;
 return profile;
}
function render(){
 if(!products.length){rows.innerHTML='<div class="empty">No live products have been added to this supplier account yet. Use “Add live product” to publish the first catalogue listing.</div>';return;}
 rows.innerHTML=products.map(p=>'<article class="record" style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:0;flex:1"><strong>'+esc(p.name)+'</strong><small>'+esc(p.category||'Uncategorised')+' · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString()+' · '+money(p.unit_price,p.currency)+'</small>'+(p.description?'<p class="subtext">'+esc(p.description)+'</p>':'')+(p.hs_code?'<small>HS code: '+esc(p.hs_code)+'</small>':'')+(p.lead_time_days?'<small>Lead time: '+Number(p.lead_time_days)+' days</small>':'')+'</div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><span class="pill '+(p.is_active?'ready':'info')+'">'+(p.is_active?'ACTIVE':'INACTIVE')+'</span>'+(p.is_active?'<button class="btn" type="button" data-product-deactivate="'+esc(p.id)+'">Unpublish</button>':'<button class="btn" type="button" data-product-activate="'+esc(p.id)+'">Publish</button>')+'</div></article>').join('');
}
async function load(){
 rows.innerHTML='<div class="empty">Loading your live VTG products from Supabase…</div>';
 try{
  await connect();
  const result=await db.from('products').select('id,name,category,description,unit_price,currency,minimum_order_quantity,hs_code,lead_time_days,image_urls,is_active,created_at').eq('supplier_id',user.id).order('created_at',{ascending:false}).limit(200);
  if(result.error)throw result.error;
  products=result.data||[];render();
  say('Connected as '+(profile.full_name||'supplier')+'. Live catalogue records are stored in Supabase.');
 }catch(error){rows.innerHTML='<div class="empty">'+esc(error.message||'Could not load live products.')+' <button class="btn" type="button" id="retrySupabaseProducts">Try again</button></div>';say(error.message||'Supabase catalogue unavailable.');$('retrySupabaseProducts')?.addEventListener('click',load);}
}
function showForm(){if(preview){say('Preview mode: sign in without preview mode to publish live products.');return;}form.classList.toggle('hidden');if(!form.classList.contains('hidden'))$('liveProductName')?.focus();}
document.addEventListener('click',event=>{
 const t=event.target.closest('#liveProductToggle');if(t){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();showForm();return;}
 const deactivate=event.target.closest('[data-product-deactivate]'),activate=event.target.closest('[data-product-activate]');
 if(!deactivate&&!activate)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 const id=(deactivate||activate).dataset.productDeactivate||(deactivate||activate).dataset.productActivate;
 const active=!!activate;
 (async()=>{try{await connect();const result=await db.from('products').update({is_active:active,updated_at:new Date().toISOString()}).eq('id',id).eq('supplier_id',user.id).select('id').maybeSingle();if(result.error)throw result.error;if(!result.data)throw new Error('Product could not be updated. Refresh and try again.');await load();}catch(e){say(e.message||'Could not update product status.');}})();
},true);
document.addEventListener('submit',event=>{
 if(event.target!==form)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 (async()=>{
  const button=$('liveProductSave');if(button){button.disabled=true;button.textContent='Saving…';}
  try{
   if(preview)throw new Error('Preview mode cannot publish products.');
   await connect();
   const fd=new FormData(form),name=String(fd.get('name')||'').trim(),price=Number(fd.get('unitPriceUsd'));
   const moqText=String(fd.get('minOrderQty')||'').trim(),moq=moqText?Number((moqText.match(/^\d+/)||[])[0]):1;
   if(name.length<2)throw new Error('Enter a product name with at least two characters.');
   if(!Number.isFinite(price)||price<=0)throw new Error('Enter a valid unit price greater than zero.');
   if(!Number.isSafeInteger(moq)||moq<1)throw new Error('Minimum order quantity must begin with a whole number greater than zero.');
   const leadText=String(fd.get('leadTime')||'').trim();
   const leadMatch=leadText.match(/^\s*(\d+)\s*(?:days?)?\s*$/i);
   const image=String(fd.get('imageUrl')||'').trim();
   const description=String(fd.get('description')||'').trim();
   const details=[description,leadText&&!leadMatch?'Supplier-stated lead time: '+leadText:''].filter(Boolean).join('\n\n')||null;
   const payload={supplier_id:user.id,name,category:String(fd.get('category')||'').trim()||null,description:details,unit_price:price,currency:'USD',minimum_order_quantity:moq,hs_code:String(fd.get('hsCode')||'').trim()||null,lead_time_days:leadMatch?Number(leadMatch[1]):null,origin_country:profile.country||null,image_urls:image?[image]:[],is_active:true};
   const result=await db.from('products').insert(payload).select('id').single();
   if(result.error)throw result.error;
   form.reset();form.classList.add('hidden');say('Product published to the live VTG catalogue. It is visible to buyers while active; it is not marked as VTG-verified.');
   await load();
  }catch(error){say(error.message||'Product could not be saved to Supabase.');}
  finally{if(button){button.disabled=false;button.textContent='Save to VTG catalogue';}}
 })();
},true);
$('liveProductCancel')?.addEventListener('click',()=>{form.reset();form.classList.add('hidden');});
if(preview){say('Preview mode: sign in without preview mode to manage the live VTG catalogue.');rows.innerHTML='<div class="empty">Live catalogue management requires an authenticated supplier account. <a href="/signin.html?role=supplier&next=%2Fsupplier-dashboard.html%23products">Sign in ↗</a></div>';}
else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
window.loadSupplierLiveProducts=load;
})();