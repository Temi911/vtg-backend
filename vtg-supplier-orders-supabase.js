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
   const base='id,reference,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,created_at';
   const q=cols=>client.from('trade_orders').select(cols).eq('supplier_id',userId).order('created_at',{ascending:false}).limit(100);
   let {data,error}=await q(base+',buyer:profiles!trade_orders_buyer_id_fkey(full_name),product:products(name)');
   if(error)({data,error}=await q(base));
   if(error)throw error;
   if(!data?.length){host.innerHTML='<div class="empty">No buyer orders yet. When a buyer accepts one of your quotations, the order appears here.</div>';notice('Connected to VTG. Orders are created when a buyer accepts your quotation.');return}
   host.innerHTML=data.map(o=>{
    const total=(Number(o.quantity)||0)*(Number(o.unit_price)||0);
    return '<article class="record-card"><strong>'+esc(o.reference||'Order')+'</strong><p>'+esc(o.product?.name||'Product')+' · Buyer: '+esc(o.buyer?.full_name||'VTG buyer')+'</p><p>'+Number(o.quantity||0).toLocaleString()+' units · '+esc(o.currency||'USD')+' '+Number(o.unit_price||0).toLocaleString()+' / unit · total '+esc(o.currency||'USD')+' '+total.toLocaleString()+'</p><p class="small muted">Status: <b>'+esc(String(o.status||'').replace(/_/g,' '))+'</b>'+(o.destination_port?' · To '+esc(o.destination_port):'')+(o.incoterm?' · '+esc(o.incoterm):'')+' · '+esc(new Date(o.created_at).toLocaleDateString())+'</p></article>';
   }).join('');
   notice('Connected to VTG. Post milestones for accepted trades in the Shared Trade Desk.');
  }catch(e){host.innerHTML='<div class="empty">Unable to load orders.</div>';notice(e.message||'Unable to load orders.',true)}
  finally{busy=false}
 }
 document.addEventListener('DOMContentLoaded',()=>{$('liveOrdersRefresh')?.addEventListener('click',load);setTimeout(load,0)});
 window.loadSupplierLiveOrders=load;
})();
