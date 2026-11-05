(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => typeof window.esc === 'function' ? window.esc(value) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let loading = false;

  async function getClient(){
    const auth = await window.VTG_AUTH_READY;
    const {data,error} = await auth.client.auth.getSession();
    if(error) throw error;
    if(!data.session) throw new Error('Your secure session has expired. Please sign in again.');
    const {data:profile,error:profileError} = await auth.client.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();
    if(profileError) throw profileError;
    if(profile.role !== 'buyer' || !profile.is_active) throw new Error('An active buyer account is required.');
    return auth.client;
  }

  function renderEvents(events){
    if(!events.length) return '<p class="small muted" style="margin:9px 0 0">No logistics events have been recorded for this shipment yet.</p>';
    return '<div class="notice" style="margin-top:10px"><strong>Account-linked logistics events</strong><div style="margin-top:6px">'+events.map(event =>
      '<p style="margin:6px 0"><b>'+esc(String(event.event_type||'Shipment update').replaceAll('_',' '))+'</b>'+
      (event.location?' · '+esc(event.location):'')+
      (event.description?' — '+esc(event.description):'')+
      (event.event_time?' <small>'+esc(new Date(event.event_time).toLocaleString())+'</small>':'')+'</p>'
    ).join('')+'</div></div>';
  }

  async function load(){
    const host = $('liveOrdersRows');
    if(!host || loading) return;
    if(new URLSearchParams(location.search).get('preview') === '1'){
      host.innerHTML = '<div class="empty">Preview mode: account-linked orders and logistics events are private records. Sign in as a buyer to view them.</div>';
      return;
    }
    loading = true;
    host.innerHTML = '<div class="empty">Loading account-linked orders from VTG…</div>';
    try{
      const supabase = await getClient();
      const {data:orders,error} = await supabase.from('trade_orders')
        .select('id,reference,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,created_at,supplier:profiles!trade_orders_supplier_id_fkey(full_name),product:products(name)')
        .order('created_at',{ascending:false}).limit(100);
      if(error) throw error;
      if(!orders || !orders.length){
        host.innerHTML = '<div class="empty">No orders have been created for this buyer account yet. An accepted supplier quotation can create a linked trade order.</div>';
        return;
      }
      const cards = await Promise.all(orders.map(async order => {
        const {data:shipments,error:shipmentError} = await supabase.from('shipments')
          .select('id,carrier,tracking_number,container_number,origin_port,destination_port,current_location,status,progress_percent,estimated_arrival,created_at')
          .eq('order_id',order.id).order('created_at',{ascending:false}).limit(10);
        if(shipmentError) throw shipmentError;
        const linked = shipments || [];
        const shipmentCards = await Promise.all(linked.map(async shipment => {
          const {data:events,error:eventError} = await supabase.from('shipment_events')
            .select('id,event_type,description,location,event_time').eq('shipment_id',shipment.id)
            .order('event_time',{ascending:false}).limit(50);
          if(eventError) throw eventError;
          return '<div class="notice" style="margin-top:12px"><strong>Shipment record</strong>'+
            '<p style="margin:6px 0"><b>Status:</b> '+esc(shipment.status||'Status not supplied')+
            (shipment.carrier?' · <b>Carrier:</b> '+esc(shipment.carrier):'')+'</p>'+
            (shipment.tracking_number?'<p style="margin:5px 0"><b>Tracking:</b> '+esc(shipment.tracking_number)+'</p>':'')+
            (shipment.container_number?'<p style="margin:5px 0"><b>Container:</b> '+esc(shipment.container_number)+'</p>':'')+
            '<p style="margin:5px 0"><b>Route:</b> '+esc(shipment.origin_port||'Origin not recorded')+' → '+esc(shipment.destination_port||'Destination not recorded')+'</p>'+
            (shipment.current_location?'<p style="margin:5px 0"><b>Last recorded location:</b> '+esc(shipment.current_location)+'</p>':'')+
            (shipment.estimated_arrival?'<p style="margin:5px 0"><b>Estimated arrival:</b> '+esc(new Date(shipment.estimated_arrival+'T00:00:00').toLocaleDateString())+' (estimate)</p>':'')+
            renderEvents(events||[])+'</div>';
        }));
        const qty = Number(order.quantity||0), unit = Number(order.unit_price||0);
        const total = (qty*unit).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        return '<article class="record-card"><div class="record-top"><div><strong>'+esc(order.reference||'VTG order')+'</strong>'+
          '<p class="small muted">'+esc(order.supplier?.full_name||'Supplier')+' · '+(order.created_at?esc(new Date(order.created_at).toLocaleDateString()):'Date unavailable')+'</p>'+
          (order.product?.name?'<p class="small muted">'+esc(order.product.name)+'</p>':'')+'</div><span class="chip">'+esc(String(order.status||'pending').replaceAll('_',' ').toUpperCase())+'</span></div>'+
          '<p style="margin:8px 0"><b>Quantity:</b> '+qty.toLocaleString()+' · <b>Order value:</b> '+esc(order.currency||'USD')+' '+total+
          ' · <b>Incoterm:</b> '+esc(order.incoterm||'Not specified')+'</p>'+
          '<p class="small muted"><b>Order route:</b> '+esc(order.origin_port||'Origin not recorded')+' → '+esc(order.destination_port||'Destination not recorded')+'</p>'+
          (shipmentCards.length?shipmentCards.join(''):'<p class="small muted" style="margin:9px 0 0">No logistics-service shipment record is linked to this order yet. No shipment event is inferred from trade assumptions.</p>')+
          '</article>';
      }));
      host.innerHTML = cards.join('');
    }catch(error){
      host.innerHTML = '<div class="empty">Could not load account-linked orders. '+esc(error.message||'Supabase request failed')+' <button class="btn" type="button" id="retrySupabaseOrders">Try again</button></div>';
      $('retrySupabaseOrders')?.addEventListener('click',load);
    }finally{loading=false;}
  }

  window.VTGBuyerOrders = {load};
  document.addEventListener('DOMContentLoaded',()=>{
    $('refreshLiveOrders')?.addEventListener('click',load);
    load();
  },{once:true});
})();