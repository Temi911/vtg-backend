(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,pricing=[],busy=false;
 function note(msg,bad){const n=$('inspectionRequestNotice');if(!n)return;n.textContent=msg;n.className='notice'+(bad?' error':'');n.hidden=!msg}
 async function context(){
  if(ctx)return ctx;
  let auth;try{auth=await window.VTG_AUTH_READY}catch(e){auth={client:window.VTG_SUPABASE}}
  const client=auth?.client||window.VTG_SUPABASE;if(!client)throw new Error('VTG secure sign-in service is unavailable. Refresh and try again.');
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Sign in with your buyer account to request an inspection.');
  const {data:p,error:pe}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
  if(pe)throw pe;if(!p||p.role!=='buyer'||!p.is_active)throw new Error('An active buyer account is required to request an inspection.');
  ctx={client,userId:data.session.user.id};return ctx;
 }
 async function call(path,method,body){
  const {client}=await context();
  const r=await client.functions.invoke('vtg-inspection-workflow/'+path,{method,body});
  if(r.error){let m=r.error.message;try{const j=await r.error.context?.json?.();if(j?.error)m=j.error}catch(_){ }throw new Error(m||'Request failed')}
  return r.data;
 }
 function fillOrders(rows){
  const s=$('inspectionOrderId');if(!s)return;
  const ok=(rows||[]).filter(o=>!['draft','cancelled','delivered','disputed'].includes(String(o.status||'').toLowerCase()));
  s.innerHTML=ok.length?'<option value="">Select a confirmed purchase order</option>'+ok.map(o=>'<option value="'+esc(o.id)+'" data-supplier="'+esc(o.supplier?.full_name||'')+'">'+esc(o.reference||o.id)+' · '+esc(o.supplier?.full_name||'Supplier')+'</option>').join(''):'<option value="">No eligible orders — accept a supplier quotation first</option>';
 }
 function fillPricing(){
  const cats=[...new Set(pricing.map(p=>p.category))].filter(Boolean),c=$('inspectionCategory');if(!c)return;
  c.innerHTML=cats.length?cats.map(x=>'<option value="'+esc(x)+'">'+esc(x.replace(/-/g,' '))+'</option>').join(''):'<option value="general-merchandise">general merchandise</option>';
 }
 async function load(){
  if(!$('inspectionRequestForm'))return;
  try{
   const {client,userId}=await context();
   const {data,error}=await client.from('trade_orders').select('id,reference,status,supplier:supplier_id(full_name)').eq('buyer_id',userId).order('created_at',{ascending:false}).limit(100);
   if(error)throw error;fillOrders(data);
   const pr=await call('pricing','GET');pricing=pr?.pricing||[];fillPricing();note('');
  }catch(e){const s=$('inspectionOrderId');if(s)s.innerHTML='<option value="">Unable to load orders</option>';note(e.message||'Unable to load your orders.',true)}
 }
 function payload(f){
  const v=n=>f.elements[n]?.value?.trim()||'';
  return {orderId:v('orderId'),country:v('country'),city:v('city'),productName:v('productName'),category:v('category'),quantity:Number(v('quantity')),serviceLevel:v('serviceLevel')||'standard',supplierName:v('supplierName'),supplierAddress:v('supplierAddress'),supplierContact:v('supplierContact'),requestedChecks:v('requestedChecks'),addVideo:!!f.elements.addVideo?.checked,urgent:!!f.elements.urgent?.checked};
 }
 async function quote(){
  const f=$('inspectionRequestForm');if(!f||busy)return;const b=payload(f);
  if(!b.country||!b.category||!(b.quantity>0)){note('Choose country, category and a whole-number quantity to see the fee.',true);return}
  try{const r=await call('quote','POST',b);$('inspectionQuote').textContent='Inspection fee: USD '+Number(r.quote.buyerFeeUsd).toFixed(2);note('')}
  catch(e){$('inspectionQuote').textContent='';note(e.message,true)}
 }
 async function submit(ev){
  ev.preventDefault();if(busy)return;const f=ev.currentTarget,b=payload(f);
  if(!b.orderId){note('Select an existing confirmed purchase order.',true);return}
  if(!Number.isInteger(b.quantity)||b.quantity<1){note('Quantity must be a whole number of at least 1.',true);return}
  busy=true;const btn=f.querySelector('button[type=submit]');if(btn)btn.disabled=true;note('Submitting your inspection request…');
  try{
   const r=await call('requests','POST',b);
   note('Inspection request '+(r.request?.reference||'')+' created. Fee USD '+Number(r.payment?.amountUsd||0).toFixed(2)+' — payment status: '+(r.payment?.status||'unpaid')+'. VTG will assign an inspector; no inspection is carried out until the request is paid and assigned.');
   f.reset();$('inspectionQuote').textContent='';
   $('refreshLiveInspections')?.click();
  }catch(e){note(e.message,true)}
  finally{busy=false;if(btn)btn.disabled=false}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('inspectionRequestForm')?.addEventListener('submit',submit);
  $('inspectionQuoteBtn')?.addEventListener('click',quote);
  setTimeout(load,0);
 });
})();
