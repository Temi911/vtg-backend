(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){
    const host=$('liveEnquiriesRows');if(!host)return;
    host.innerHTML='<div class="empty">Loading your secure sourcing requests…</div>';
    try{
      const auth=await window.VTG_AUTH_READY;
      const {data:sessionData,error:sessionError}=await auth.client.auth.getSession();
      if(sessionError)throw sessionError;
      const session=sessionData.session;
      if(!session){host.innerHTML='<div class="empty">Sign in as a buyer to view account-linked sourcing requests.</div>';return;}
      const {data:profile,error:profileError}=await auth.client.from('profiles').select('role,is_active').eq('id',session.user.id).single();
      if(profileError)throw profileError;
      if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required.');
      const {data:rows,error}=await auth.client.from('trade_quotes')
        .select('id,order_id,product_id,quantity,status,buyer_message,created_at,product:products!trade_quotes_product_id_fkey(name),supplier:profiles!trade_quotes_supplier_id_fkey(full_name)')
        .eq('buyer_id',session.user.id).eq('status','requested').order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      if(!rows?.length){host.innerHTML='<div class="empty">No live sourcing requests have been submitted from this account yet. RFQ drafts are managed separately in your buyer workspace.</div>';return;}
      host.innerHTML=rows.map(row=>'<article class="row" style="display:block;padding:14px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>'+esc(row.product?.name||'Supplier sourcing request')+'</strong><span class="chip">AWAITING SUPPLIER QUOTATION</span></div><p><b>Supplier:</b> '+esc(row.supplier?.full_name||'VTG supplier')+' · <b>Quantity:</b> '+Number(row.quantity||0).toLocaleString()+'</p>'+(row.buyer_message?'<p>'+esc(row.buyer_message)+'</p>':'')+'<small>Submitted '+(row.created_at?new Date(row.created_at).toLocaleString():'date unavailable')+'</small></article>').join('');
    }catch(error){host.innerHTML='<div class="empty">Could not load Supabase sourcing requests. '+esc(error.message)+' <button class="btn" id="sbRequestRetry" type="button">Try again</button></div>';$('sbRequestRetry')?.addEventListener('click',load);}
  }
  window.loadLiveEnquiries=load;
  document.addEventListener('DOMContentLoaded',()=>{$('refreshLiveEnquiries')?.addEventListener('click',load);load();});
})();