(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loading=false,queued=false,client=null,buyerId=null,liveChannel=null;
async function getClient(){
 const auth=await window.VTG_AUTH_READY;if(!auth?.client)throw new Error('VTG secure account service is unavailable. Please reload and try again.');
 const {data,error}=await auth.client.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Your secure session has expired. Please sign in again.');buyerId=data.session.user.id;
 const {data:p,error:pe}=await auth.client.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();if(pe)throw pe;
 if(p.role!=='buyer'||!p.is_active)throw new Error('An active buyer account is required.');return auth.client;
}
function date(v,time){if(!v)return 'Date not supplied';const d=new Date(v);if(Number.isNaN(d.getTime()))return 'Date unavailable';return d.toLocaleString(undefined,time?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'});}
function label(v){return String(v||'update').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function renderEvents(a){if(!a.length)return '<p class="small muted" style="margin:9px 0 0">No logistics events have been recorded for this shipment yet.</p>';return '<div class="notice" style="margin-top:10px"><strong>Recorded logistics events</strong><div style="margin-top:6px">'+a.map(e=>'<p style="margin:6px 0"><b>'+esc(label(e.event_type))+'</b>'+(e.location?' · '+esc(e.location):'')+(e.description?' — '+esc(e.description):'')+' <small>'+esc(date(e.event_time,true))+'</small></p>').join('')+'</div></div>';}
function renderMilestones(a){if(!a.length)return '<p class="small muted" style="margin:9px 0 0">No order milestones have been recorded yet.</p>';return '<div class="notice" style="margin-top:10px"><strong>Order milestones</strong><div style="margin-top:6px">'+a.map(e=>'<p style="margin:7px 0"><b>'+esc(label(e.milestone))+'</b> · '+esc(date(e.event_at,true))+(e.location?' · '+esc(e.location):'')+'<br><span class="small muted">'+esc(e.description)+'</span></p>').join('')+'</div></div>';}
function scheduleLoad(){if(queued)return;queued=true;setTimeout(()=>{queued=false;load();},180);}
async function load(){
 const host=$('liveOrdersRows');if(!host||loading)return;
 
 loading=true;host.innerHTML='<div class="empty">Loading account-linked orders from VTG…</div>';
 try{
  client=client||await getClient();
  const {data:orders,error}=await client.from('trade_orders').select('id,reference,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,created_at,supplier:profiles!trade_orders_supplier_id_fkey(full_name),product:products(name)').eq('buyer_id',buyerId).order('created_at',{ascending:false}).limit(100);
  if(error)throw error;if(!orders?.length){host.innerHTML='<div class="empty">No orders have been created for this buyer account yet. An accepted supplier quotation can create a linked trade order.</div>';return;}
  const cards=await Promise.all(orders.map(async o=>{
   const [sr,mr]=await Promise.all([
    client.from('shipments').select('id,carrier,tracking_number,container_number,origin_port,destination_port,current_location,status,progress_percent,estimated_arrival,created_at').eq('order_id',o.id).order('created_at',{ascending:false}).limit(10),
    client.from('trade_order_milestones').select('id,milestone,description,location,event_at').eq('order_id',o.id).order('event_at',{ascending:false}).limit(50)
   ]);
   if(sr.error)throw sr.error;if(mr.error)throw mr.error;
   const shipCards=await Promise.all((sr.data||[]).map(async sh=>{
    const {data:ev,error:ee}=await client.from('shipment_events').select('id,event_type,description,location,event_time').eq('shipment_id',sh.id).order('event_time',{ascending:false}).limit(50);if(ee)throw ee;
    const progress=Number.isFinite(Number(sh.progress_percent))?Math.min(100,Math.max(0,Number(sh.progress_percent))):null;
    return '<div class="notice" style="margin-top:12px"><strong>Account-linked shipment record</strong><p style="margin:6px 0"><b>Status:</b> '+esc(label(sh.status||'not supplied'))+(sh.carrier?' · <b>Carrier:</b> '+esc(sh.carrier):'')+'</p>'+
    (sh.tracking_number?'<p style="margin:5px 0"><b>Tracking reference:</b> '+esc(sh.tracking_number)+'</p>':'')+(sh.container_number?'<p style="margin:5px 0"><b>Container:</b> '+esc(sh.container_number)+'</p>':'')+
    '<p style="margin:5px 0"><b>Route:</b> '+esc(sh.origin_port||'Origin not recorded')+' → '+esc(sh.destination_port||'Destination not recorded')+'</p>'+
    (sh.current_location?'<p style="margin:5px 0"><b>Last recorded location:</b> '+esc(sh.current_location)+'</p>':'')+(progress!==null?'<p style="margin:5px 0"><b>Recorded progress:</b> '+progress+'%</p>':'')+
    (sh.estimated_arrival?'<p style="margin:5px 0"><b>Estimated arrival:</b> '+esc(date(sh.estimated_arrival,false))+' (estimate)</p>':'')+renderEvents(ev||[])+'</div>';
   }));
   const qty=Math.max(0,Number(o.quantity)||0),unit=Math.max(0,Number(o.unit_price)||0),total=(qty*unit).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
   return '<article class="record-card"><div class="record-top"><div><strong>'+esc(o.reference||'VTG order')+'</strong><p class="small muted">'+esc(o.supplier?.full_name||'Supplier')+' · '+esc(date(o.created_at,false))+'</p>'+(o.product?.name?'<p class="small muted">'+esc(o.product.name)+'</p>':'')+'</div><span class="chip">'+esc(label(o.status||'pending').toUpperCase())+'</span></div>'+
   '<p style="margin:8px 0"><b>Quantity:</b> '+qty.toLocaleString()+' · <b>Order value:</b> '+esc(o.currency||'USD')+' '+total+' · <b>Incoterm:</b> '+esc(o.incoterm||'Not specified')+'</p>'+
   '<p class="small muted"><b>Order route:</b> '+esc(o.origin_port||'Origin not recorded')+' → '+esc(o.destination_port||'Destination not recorded')+'</p>'+renderMilestones(mr.data||[])+
   (shipCards.length?shipCards.join(''):'<p class="small muted" style="margin:9px 0 0">No logistics-service shipment record is linked to this order yet. Shipment progress is not inferred from order status or trade assumptions.</p>')+'</article>';
  }));
  host.innerHTML=cards.join('');
 }catch(e){host.innerHTML='<div class="empty">Could not load account-linked orders. '+esc(e.message||'Supabase request failed')+' <button class="btn" type="button" id="retrySupabaseOrders">Try again</button></div>';$('retrySupabaseOrders')?.addEventListener('click',load);}
 finally{loading=false;}
}
async function connectRealtime(){try{client=client||await getClient();const {data}=await client.auth.getSession();const id=data?.session?.user?.id;if(!id||liveChannel)return;liveChannel=client.channel('buyer-orders-'+id)
 .on('postgres_changes',{event:'*',schema:'public',table:'trade_orders',filter:'buyer_id=eq.'+id},scheduleLoad)
 .on('postgres_changes',{event:'*',schema:'public',table:'trade_order_milestones'},scheduleLoad)
 .on('postgres_changes',{event:'*',schema:'public',table:'shipments'},scheduleLoad)
 .on('postgres_changes',{event:'*',schema:'public',table:'shipment_events'},scheduleLoad).subscribe();}catch(_){/* Manual refresh remains available. */}}
window.VTGBuyerOrders={load,refresh:load};
document.addEventListener('DOMContentLoaded',()=>{$('refreshLiveOrders')?.addEventListener('click',load);load();connectRealtime();},{once:true});
})();