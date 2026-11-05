(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(value,currency)=>esc(currency||'USD')+' '+Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  let supabase=null,session=null,supplierId=null;
  function notice(message){const el=$('liveQuotesNotice');if(el)el.textContent=message;}
  function preview(){return new URLSearchParams(location.search).get('preview')==='1';}
  async function connect(){
    const auth=await window.VTG_AUTH_READY;
    const result=await auth.client.auth.getSession();
    if(result.error)throw result.error;
    if(!result.data.session)throw new Error('Sign in with your supplier account to view buyer requests.');
    supabase=auth.client;session=result.data.session;supplierId=session.user.id;
    const p=await supabase.from('profiles').select('role,is_active,full_name').eq('id',supplierId).single();
    if(p.error)throw p.error;
    if(p.data.role!=='supplier'||!p.data.is_active)throw new Error('An active supplier account is required to manage buyer quote requests.');
    return p.data;
  }
  function render(rows){
    const host=$('liveQuotesRows');if(!host)return;
    if(!rows.length){host.innerHTML='<div class="empty">There are no open buyer quote requests assigned to this supplier yet.</div>';return;}
    host.innerHTML=rows.map(q=>{
      const product=q.product?.name||'Product not specified';
      const buyer=q.buyer?.full_name||'VTG buyer';
      const order=q.order?.reference||'Linked trade order';
      const qty=Number(q.quantity||0);
      return '<article class="record" style="display:block;padding:14px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong>'+esc(product)+'</strong><small>'+esc(buyer)+' · '+esc(order)+' · '+(q.created_at?new Date(q.created_at).toLocaleDateString():'Date unavailable')+'</small></div><span class="pill pending">REQUESTED</span></div><p style="font-size:10px;margin:10px 0"><b>Quantity:</b> '+qty.toLocaleString()+' · <b>Buyer budget / requested unit price:</b> '+(q.unit_price==null?'Not specified':money(q.unit_price,q.currency))+'</p>'+(q.incoterm?'<p style="font-size:10px;margin:6px 0"><b>Requested Incoterm:</b> '+esc(q.incoterm)+'</p>':'')+(q.buyer_message?'<p style="font-size:10px;margin:6px 0"><b>Buyer requirements:</b> '+esc(q.buyer_message)+'</p>':'')+
      '<form class="field-grid" data-supplier-quote-form="'+esc(q.id)+'" style="margin-top:13px;padding-top:13px;border-top:1px solid var(--line)"><div class="field"><label>Unit price *</label><input name="unit_price" type="number" min="0.000001" step="0.000001" required placeholder="Your offered unit price"></div><div class="field"><label>Currency *</label><select name="currency" required><option>USD</option><option>CNY</option><option>KRW</option><option>EUR</option><option>NGN</option></select></div><div class="field"><label>Incoterm and named place</label><input name="incoterm" maxlength="100" placeholder="e.g. FOB Ningbo"></div><div class="field"><label>Delivery lead time (days)</label><input name="delivery_days" type="number" min="1" max="3650" step="1" placeholder="e.g. 30"></div><div class="field"><label>Offer valid until</label><input name="valid_until" type="date"></div><div class="field full"><label>Supplier response / commercial notes</label><textarea name="supplier_message" maxlength="3000" placeholder="Clarify specifications, packaging, payment terms and exclusions."></textarea></div><div class="field full"><div class="form-actions"><button class="btn primary" type="submit" data-submit-quote>Send quotation</button><button class="btn danger" type="button" data-decline-quote="'+esc(q.id)+'">Decline request</button></div></div></form></article>';
    }).join('');
  }
  async function load(){
    const host=$('liveQuotesRows');if(!host)return;
    if(preview()){notice('Preview mode: sign in without preview mode to load private buyer requests.');host.innerHTML='<div class="empty">Live quote requests require an authenticated supplier account. <a href="/signin.html?role=supplier&next=%2Fsupplier-dashboard.html%23rfqs">Sign in ↗</a></div>';return;}
    host.innerHTML='<div class="empty">Loading buyer quote requests from Supabase…</div>';
    try{
      const profile=await connect();
      const result=await supabase.from('trade_quotes').select('id,order_id,buyer_id,supplier_id,product_id,quantity,unit_price,currency,incoterm,status,buyer_message,created_at,order:trade_orders!trade_quotes_order_id_fkey(reference),buyer:profiles!trade_quotes_buyer_id_fkey(full_name),product:products!trade_quotes_product_id_fkey(name)').eq('supplier_id',supplierId).eq('status','requested').order('created_at',{ascending:false}).limit(100);
      if(result.error)throw result.error;
      render(result.data||[]);
      notice('Signed in as '+(profile.full_name||'supplier')+'. Showing open quote requests assigned to this account.');
    }catch(error){notice(error.message||'Could not load buyer quote requests.');host.innerHTML='<div class="empty">'+esc(error.message||'Could not load requests.')+' <button class="btn" type="button" id="supplierQuoteRetry">Try again</button></div>';$('supplierQuoteRetry')?.addEventListener('click',load);}
  }
  async function submit(form,decision){
    const button=form.querySelector('[data-submit-quote]')||form.querySelector('[data-decline-quote]');
    if(button)button.disabled=true;
    try{
      if(!supabase||!session)await connect();
      const id=form.dataset.supplierQuoteForm;
      let changes;
      if(decision==='declined')changes={status:'declined',supplier_message:'Supplier declined this request.'};
      else{
        const data=new FormData(form),price=Number(data.get('unit_price')),days=data.get('delivery_days')?Number(data.get('delivery_days')):null;
        if(!Number.isFinite(price)||price<=0)throw new Error('Enter a valid unit price greater than zero.');
        if(days!==null&&(!Number.isInteger(days)||days<1||days>3650))throw new Error('Enter a valid delivery period in days.');
        const valid=data.get('valid_until');
        if(valid&&new Date(valid+'T23:59:59').getTime()<=Date.now())throw new Error('The offer validity date must be in the future.');
        changes={unit_price:price,currency:String(data.get('currency')||'USD'),incoterm:String(data.get('incoterm')||'').trim()||null,delivery_days:days,valid_until:valid?new Date(valid+'T23:59:59').toISOString():null,supplier_message:String(data.get('supplier_message')||'').trim()||null,status:'quoted'};
      }
      const result=await supabase.from('trade_quotes').update(changes).eq('id',id).eq('supplier_id',supplierId).eq('status','requested').select('id').maybeSingle();
      if(result.error)throw result.error;
      if(!result.data)throw new Error('This request is no longer open or is not assigned to your supplier account. Refresh the list.');
      if(typeof window.toast==='function')window.toast(decision==='declined'?'Buyer request declined.':'Quotation sent to the buyer.');
      else notice(decision==='declined'?'Buyer request declined.':'Quotation sent to the buyer.');
      await load();
    }catch(error){notice(error.message||'The supplier response could not be saved.');if(button)button.disabled=false;}
  }
  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-supplier-quote-form]');if(!form)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(!confirm('Send this quotation to the buyer?'))return;
    submit(form,'quoted');
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-decline-quote]');if(!button)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(!confirm('Decline this buyer quote request?'))return;
    const form=button.closest('form[data-supplier-quote-form]');if(form)submit(form,'declined');
  },true);
  window.loadSupplierLiveQuotes=load;
  window.addEventListener('DOMContentLoaded',()=>{
    $('liveQuotesRefresh')?.addEventListener('click',load);
    load();
  });
})();