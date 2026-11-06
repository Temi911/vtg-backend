(function(){
  'use strict';
  async function client(){const auth=await window.VTG_AUTH_READY;const {data,error}=await auth.client.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Your secure session has expired. Please sign in again.');return {client:auth.client,session:data.session};}
  function esc(value){return typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function load(){
    const host=document.getElementById('liveQuotesRows');if(!host)return;
    host.innerHTML='<div class="empty">Loading your Supabase quotations…</div>';
    try{
      const {client:supabase,session}=await client();
      const {data:profile,error:profileError}=await supabase.from('profiles').select('role,is_active').eq('id',session.user.id).single();
      if(profileError)throw profileError;
      if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required.');
      const {data:quotes,error}=await supabase.from('trade_quotes').select('id,order_id,supplier_id,product_id,quantity,unit_price,currency,incoterm,delivery_days,status,buyer_message,supplier_message,valid_until,created_at,supplier:profiles!trade_quotes_supplier_id_fkey(full_name),product:products!trade_quotes_product_id_fkey(name)').eq('buyer_id',session.user.id).order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      window.liveQuotes=(quotes||[]).filter(q=>String(q.status||'').toLowerCase()!=='requested');
      const visibleQuotes=window.liveQuotes;
      if(!visibleQuotes.length){host.innerHTML='<div class="empty">No quotations are linked to this account yet. Supplier responses will appear here.</div>';return;}
      host.innerHTML=visibleQuotes.map(q=>{
        const status=String(q.status||'requested').toLowerCase(),currency=esc(q.currency||'USD'),qty=Number(q.quantity||0),price=Number(q.unit_price||0);
        const total=(qty*price).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        const canDecide=status==='quoted'&&(!q.valid_until||Date.parse(q.valid_until)>Date.now());
        const actions=canDecide?'<button class="btn primary" type="button" data-sb-quote-decision="accepted" data-quote-id="'+esc(q.id)+'">Accept quotation</button><button class="btn" type="button" data-sb-quote-decision="declined" data-quote-id="'+esc(q.id)+'">Decline quotation</button>':'';
        return '<article class="row" style="display:block;padding:14px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong>'+esc(q.product?.name||'Trade quotation')+'</strong><p>'+esc(q.supplier?.full_name||'VTG supplier')+' · '+(q.created_at?new Date(q.created_at).toLocaleDateString():'Date unavailable')+'</p></div><span class="chip">'+esc(status.replaceAll('_',' ').toUpperCase())+'</span></div><p><b>Quantity:</b> '+qty.toLocaleString()+' · <b>Unit price:</b> '+(q.unit_price==null?'Awaiting supplier response':currency+' '+price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}))+(q.unit_price==null?'':' · <b>Total:</b> '+currency+' '+total)+'</p><p><b>Incoterm:</b> '+esc(q.incoterm||'Not specified')+(q.delivery_days?' · <b>Lead time:</b> '+Number(q.delivery_days)+' days':'')+'</p>'+(q.valid_until?'<p>Valid until '+esc(new Date(q.valid_until).toLocaleDateString())+'</p>':'')+(q.supplier_message?'<p>'+esc(q.supplier_message)+'</p>':'')+(q.buyer_message?'<p><b>Your request:</b> '+esc(q.buyer_message)+'</p>':'')+(status==='accepted'?'<p class="notice">Quotation accepted. The linked trade order has been confirmed.</p>':'')+(status==='declined'?'<p class="notice">You declined this quotation.</p>':'')+(actions?'<div class="formActions" style="justify-content:flex-start">'+actions+'</div>':'')+'</article>';
      }).join('');
    }catch(error){host.innerHTML='<div class="empty">Could not load Supabase quotations. '+esc(error.message)+' <button class="btn" type="button" id="sbQuoteRetry">Try again</button></div>';document.getElementById('sbQuoteRetry')?.addEventListener('click',load);}
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-sb-quote-decision]');if(!button)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const decision=button.dataset.sbQuoteDecision,quoteId=button.dataset.quoteId;
    if(!confirm(decision==='accepted'?'Accept this quotation and confirm its linked trade order?':'Decline this supplier quotation?'))return;
    button.disabled=true;
    try{
      const {client:supabase}=await client();
      const {error}=await supabase.rpc('vtg_decide_trade_quote',{p_quote_id:quoteId,p_decision:decision});
      if(error)throw error;
      if(typeof window.say==='function')window.say(decision==='accepted'?'Quotation accepted and linked trade order confirmed.':'Quotation declined.');
      await load();
      if(decision==='accepted'){if(typeof window.loadLiveOrders==='function')await window.loadLiveOrders();if(typeof window.populateLCOrders==='function')await window.populateLCOrders();}
    }catch(error){if(typeof window.say==='function')window.say(error.message||'Quotation decision could not be saved.');button.disabled=false;}
  },true);
  window.loadLiveQuotes=load;
  window.addEventListener('DOMContentLoaded',()=>{const refresh=document.getElementById('refreshLiveQuotes');refresh?.addEventListener('click',load);});
})();