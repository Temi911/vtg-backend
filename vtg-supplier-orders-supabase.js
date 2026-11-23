(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let busy=false,ctx=null;
 function notice(msg,bad){const n=$('liveOrdersNotice');if(n){n.textContent=msg;n.className='notice'+(bad?' error':'')}}
 async function context(){
  if(ctx)return ctx;
  let auth;try{auth=await window.VTG_AUTH_READY}catch(_){auth={client:window.VTG_SUPABASE}}
  const client=auth?.client||window.VTG_SUPABASE;if(!client)throw new Error('VTG secure sign-in service is unavailable. Refresh and try again.');
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Sign in with your supplier account to load server-backed orders.');
  const {data:p,error:pe}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
  if(pe)throw pe;if(!p||p.role!=='supplier'||!p.is_active)throw new Error('An active supplier account is required to view these orders.');
  ctx={client,userId:data.session.user.id};return ctx;
 }
 async function load(){
  const host=$('liveOrdersRows');if(!host||busy)return;busy=true;
  host.innerHTML='<div class="empty">Loading your VTG orders…</div>';
  try{
   const {client,userId}=await context();
   const base='id,reference,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,created_at,closed_at';
   const q=cols=>client.from('trade_orders').select(cols).eq('supplier_id',userId).order('created_at',{ascending:false}).limit(100);
   let {data,error}=await q(base+',buyer:profiles!trade_orders_buyer_id_fkey(full_name),product:products(name)');
   if(error)({data,error}=await q(base));
   if(error)throw error;
   if(!data?.length){host.innerHTML='<div class="empty">No buyer orders yet. When a buyer accepts one of your quotations, the order appears here.</div>';notice('Connected to VTG. Orders are created when a buyer accepts your quotation.');return}
   const {data:milestones,error:milestoneError}=await client.from('trade_order_milestones').select('order_id,milestone,created_by,event_at').in('order_id',data.map(o=>o.id));
   if(milestoneError)throw milestoneError;
   host.innerHTML=data.map(o=>{
    const total=(Number(o.quantity)||0)*(Number(o.unit_price)||0),deliveryRecorded=(milestones||[]).some(m=>m.order_id===o.id&&m.milestone==='delivered'&&m.created_by===userId);
    const deliveryState=o.closed_at?'<div class="notice" style="margin-top:10px"><strong>Deal closed</strong><p class="small">Buyer confirmed delivery on '+esc(new Date(o.closed_at).toLocaleString())+'</p></div>':deliveryRecorded?'<div class="notice" style="margin-top:10px"><strong>Delivery recorded</strong><p class="small">Waiting for the buyer to confirm receipt and close the deal.</p></div>':'<div style="margin-top:10px"><button class="btn" type="button" data-supplier-delivery="'+esc(o.id)+'">Record goods delivered to buyer</button></div>';
    return '<article class="record-card"><strong>'+esc(o.reference||'Order')+'</strong><p>'+esc(o.product?.name||'Product')+' · Buyer: '+esc(o.buyer?.full_name||'VTG buyer')+'</p><p>'+Number(o.quantity||0).toLocaleString()+' units · '+esc(o.currency||'USD')+' '+Number(o.unit_price||0).toLocaleString()+' / unit · total '+esc(o.currency||'USD')+' '+total.toLocaleString()+'</p><p class="small muted">Status: <b>'+esc(String(o.status||'').replace(/_/g,' '))+'</b>'+(o.destination_port?' · To '+esc(o.destination_port):'')+(o.incoterm?' · '+esc(o.incoterm):'')+' · '+esc(new Date(o.created_at).toLocaleDateString())+'</p>'+deliveryState+'</article>';
   }).join('');
   notice('Connected to VTG. Post milestones for accepted trades in the Shared Trade Desk.');
  }catch(e){host.innerHTML='<div class="empty">Unable to load orders.</div>';notice(e.message||'Unable to load orders.',true)}
  finally{busy=false}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('liveOrdersRefresh')?.addEventListener('click',load);
  $('liveOrdersRows')?.addEventListener('click',async event=>{
   const button=event.target.closest('[data-supplier-delivery]');if(!button)return;
   const details=window.prompt('Enter the delivery confirmation details, such as the recipient acknowledgement or proof-of-delivery reference.');
   if(details===null||!details.trim())return;
   const location=window.prompt('Enter the delivery location (optional).')||null;
   button.disabled=true;
   try{
    const {client,userId}=await context();
    const {error}=await client.from('trade_order_milestones').insert({order_id:button.dataset.supplierDelivery,created_by:userId,milestone:'delivered',description:details.trim().slice(0,1600),location:location?.trim().slice(0,200)||null});
    if(error)throw error;
    notice('Delivery recorded. The buyer can now confirm receipt and close the deal.');
    await load();
   }catch(error){button.disabled=false;notice(error.message||'Could not record delivery.',true);}
  });
  setTimeout(load,0);
});
 window.loadSupplierLiveOrders=load;
})();
