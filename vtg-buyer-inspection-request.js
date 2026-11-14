(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,pricing=[],busy=false;
 function note(msg,bad){const n=$('inspectionRequestNotice');if(!n)return;n.textContent=msg;n.className='notice'+(bad?' error':'');n.hidden=!msg}
 function explain(error){const message=String(error?.message||'');if(/provider has not supplied its actual fee/i.test(message))return 'The inspection provider has not confirmed its actual charge yet. Your VTG coordination fee is quantity-based, but we will only show a total after the provider confirms its fee. No request or payment has been created.';if(/No active price configured|Inspection pricing is not configured|quantity-based coordination fee/i.test(message))return 'VTG inspection pricing is not configured for this request yet. No fee has been quoted, no inspection request has been created, and no payment has been taken.';return message||'The inspection service is temporarily unavailable.'}
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
  const c=$('inspectionCategory');if(!c)return;
  const labels={"cars-automobiles":"Cars & Automobiles","motorcycles-tricycles-mobility":"Motorcycles, Tricycles & Mobility","bicycles-personal-mobility":"Bicycles & Personal Mobility","medical-supplies-healthcare":"Medical Supplies & Healthcare","agriculture-farm-products":"Agriculture & Farm Products","clothing-textiles":"Clothing & Textiles","footwear":"Footwear","fashion-accessories":"Fashion & Accessories","watches-wearables":"Watches & Wearables","electronics-technology":"Electronics & Technology","home-furniture":"Home & Furniture","kitchen-home-appliances":"Kitchen & Home Appliances","beauty-personal-care":"Beauty & Personal Care","food-beverages":"Food & Beverages","construction-equipment-machinery":"Construction Equipment & Machinery","tools-hardware":"Tools & Hardware","industrial-machinery-equipment":"Industrial Machinery & Equipment","steel-iron-metal-products":"Steel, Iron & Metal Products","solar-renewable-energy":"Solar & Renewable Energy","plumbing-water-sanitary":"Plumbing, Water & Sanitary","packaging-printing":"Packaging & Printing","office-business-supplies":"Office & Business Supplies","baby-children-products":"Baby & Children Products","cleaning-household-supplies":"Cleaning & Household Supplies","bags-luggage-travel":"Bags, Luggage & Travel","retail-commercial-equipment":"Retail & Commercial Equipment","hotel-restaurant-catering-equipment":"Hotel, Restaurant & Catering Equipment","factory-production-supplies":"Factory & Production Supplies","marine-port-equipment":"Marine & Port Equipment","logistics-transport-warehousing-equipment":"Logistics, Transport & Warehousing Equipment","building-materials":"Building Materials","electrical-power-equipment":"Electrical & Power Equipment","telecommunications-networking":"Telecommunications & Networking","industrial-materials":"Industrial Materials","general-merchandise":"General Merchandise","import-export-trade-services":"Import, Export & Trade Services"};
  const available=new Set(pricing.map(p=>p.category).filter(Boolean));
  c.innerHTML=[["cars-automobiles","Cars & Automobiles"],["motorcycles-tricycles-mobility","Motorcycles, Tricycles & Mobility"],["bicycles-personal-mobility","Bicycles & Personal Mobility"],["medical-supplies-healthcare","Medical Supplies & Healthcare"],["agriculture-farm-products","Agriculture & Farm Products"],["clothing-textiles","Clothing & Textiles"],["footwear","Footwear"],["fashion-accessories","Fashion & Accessories"],["watches-wearables","Watches & Wearables"],["electronics-technology","Electronics & Technology"],["home-furniture","Home & Furniture"],["kitchen-home-appliances","Kitchen & Home Appliances"],["beauty-personal-care","Beauty & Personal Care"],["food-beverages","Food & Beverages"],["construction-equipment-machinery","Construction Equipment & Machinery"],["tools-hardware","Tools & Hardware"],["industrial-machinery-equipment","Industrial Machinery & Equipment"],["steel-iron-metal-products","Steel, Iron & Metal Products"],["solar-renewable-energy","Solar & Renewable Energy"],["plumbing-water-sanitary","Plumbing, Water & Sanitary"],["packaging-printing","Packaging & Printing"],["office-business-supplies","Office & Business Supplies"],["baby-children-products","Baby & Children Products"],["cleaning-household-supplies","Cleaning & Household Supplies"],["bags-luggage-travel","Bags, Luggage & Travel"],["retail-commercial-equipment","Retail & Commercial Equipment"],["hotel-restaurant-catering-equipment","Hotel, Restaurant & Catering Equipment"],["factory-production-supplies","Factory & Production Supplies"],["marine-port-equipment","Marine & Port Equipment"],["logistics-transport-warehousing-equipment","Logistics, Transport & Warehousing Equipment"],["building-materials","Building Materials"],["electrical-power-equipment","Electrical & Power Equipment"],["telecommunications-networking","Telecommunications & Networking"],["industrial-materials","Industrial Materials"],["general-merchandise","General Merchandise"],["import-export-trade-services","Import, Export & Trade Services"]].filter(([value])=>available.has(value)).map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('')||'<option value="general-merchandise">General Merchandise</option>';
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
  return {orderId:v('orderId'),country:v('country'),city:v('city'),productName:v('productName'),category:v('category'),inspectionType:v('inspectionType')||'product-quality-verification',quantity:Number(v('quantity')),serviceLevel:v('serviceLevel')||'standard',supplierName:v('supplierName'),supplierAddress:v('supplierAddress'),supplierContact:v('supplierContact'),requestedChecks:v('requestedChecks'),addVideo:!!f.elements.addVideo?.checked,urgent:!!f.elements.urgent?.checked};
 }
 async function quote(){
  const f=$('inspectionRequestForm');if(!f||busy)return;const b=payload(f);
  if(!b.country||!b.category||!(b.quantity>0)){note('Choose country, category and a whole-number quantity to see the fee.',true);return}
  try{const r=await call('quote','POST',b),q=r.quote;$('inspectionQuote').textContent='Inspection provider: USD '+Number(q.providerFeeUsd).toFixed(2)+' · VTG coordination: USD '+Number(q.coordinationFeeUsd).toFixed(2)+(q.additionalServicesUsd?' · Additional services: USD '+Number(q.additionalServicesUsd).toFixed(2):'')+' · Total: USD '+Number(q.buyerFeeUsd).toFixed(2);note('Provider cost and VTG coordination are shown separately. The quotation is subject to buyer approval.')}
  catch(e){$('inspectionQuote').textContent='';note(explain(e),true)}
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
  }catch(e){note(explain(e),true)}
  finally{busy=false;if(btn)btn.disabled=false}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('inspectionRequestForm')?.addEventListener('submit',submit);
  $('inspectionQuoteBtn')?.addEventListener('click',quote);
  setTimeout(load,0);
 });
})();
