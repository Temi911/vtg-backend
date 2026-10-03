(() => {
  const token=localStorage.getItem('vtg_access_token');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>n==null?'—':Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
  const badge=s=>'<span class="atc-badge">'+esc(String(s||'').replace(/_/g,' '))+'</span>'; const financeFlag=p=>p.finance_exception&&p.finance_exception!=='normal'?'<span class="atc-badge">'+esc(p.finance_exception.replace(/_/g,' '))+'</span>':'';
  async function loadProviderReadiness(){
    const box=document.getElementById('atc-provider-readiness');
    if(!box)return;
    try{
      const r=await fetch('/api/admin/payment-providers',{headers:{Authorization:'Bearer '+token}});
      const j=await r.json();
      if(!r.ok)throw Error(j.error?.message||j.message||'Unable to load payment provider readiness');
      const label={mock:'Mock / simulation', 'live-configured':'Live adapter registered', 'live-unavailable':'Live adapter unavailable'};
      box.innerHTML='<div class="atc-provider-mode"><b>Payment mode:</b> '+esc(String(j.mode||'mock').toUpperCase())+'</div>'+((j.providers||[]).map(p=>'<div class="atc-provider-row"><div><b>'+esc(p.label)+'</b><small>'+esc(p.method.toUpperCase())+'</small></div><span class="atc-badge">'+esc(label[p.mode]||p.mode)+'</span></div>').join(''))+'<p class="atc-provider-note">Readiness reflects registered provider adapters only. A live status does not by itself prove that external funds can move or that a transaction has settled.</p>';
    }catch(e){box.innerHTML='<div class="atc-empty">'+esc(e.message)+'</div>'}
  }
  async function load(){
    if(!token) throw Error('Please sign in as an administrator.');
    const r=await fetch('/api/admin/trade/overview',{headers:{Authorization:'Bearer '+token}});
    const j=await r.json();if(!r.ok)throw Error(j.error?.message||j.message||'Unable to load trade control');
    render(j);
    loadProviderReadiness();
    loadLedger();
  }
  function render(d){
    const k=document.getElementById('atc-kpis');
    const ex={overdue:d.payments.filter(p=>p.finance_exception==='overdue').length,failed:d.payments.filter(p=>p.finance_exception==='failed').length,refunded:d.payments.filter(p=>p.finance_exception==='refunded').length,attention:d.payments.filter(p=>p.finance_exception==='attention').length};
    k.innerHTML=[['Open orders',d.summary.openOrders],['LC records',d.summary.lcs],['Payment records',d.summary.payments],['Active shipments',d.summary.activeShipments],['Overdue payments',ex.overdue],['Failed payments',ex.failed],['Refunded payments',ex.refunded],['Needs attention',ex.attention]]
      .map(x=>'<div class="atc-card"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join('');
    document.getElementById('atc-orders').innerHTML=d.orders.length?d.orders.map(o=>'<div class="atc-row"><div><b>'+esc(o.reference)+'</b><small>'+esc(o.buyer_name)+' → '+esc(o.supplier_name)+'</small></div><span>'+badge(o.status)+'</span><b>$'+fmt(o.total_amount_usd)+'</b></div>').join(''):'<div class="atc-empty">No orders found.</div>';
    document.getElementById('atc-lcs').innerHTML=d.lcs.length?d.lcs.map(x=>'<div class="atc-row"><div><b>'+esc(x.reference)+'</b><small>'+esc(x.order_reference)+' · '+esc(x.issuing_bank_name||'Bank not assigned')+'</small></div><span>'+badge(x.status)+'</span><b>$'+fmt(x.amount_usd)+'</b></div>').join(''):'<div class="atc-empty">No letters of credit found.</div>';
    document.getElementById('atc-payments').innerHTML=d.payments.length?d.payments.map(p=>'<div class="atc-row"><div><b>'+esc(String(p.method||'').toUpperCase())+'</b><small>'+esc(p.order_reference||'No linked order')+' · '+esc(p.provider_ref||'Pending provider ref')+'</small></div><span>'+badge(p.status)+'</span><b>'+fmt(p.amount)+' '+esc(p.currency)+'</b></div>').join(''):'<div class="atc-empty">No payment records found.</div>';
    document.getElementById('atc-shipments').innerHTML=d.shipments.length?d.shipments.map(s=>'<div class="atc-row"><div><b>'+esc(s.order_reference)+'</b><small>'+esc(s.origin_port||'Origin pending')+' → '+esc(s.destination_port||'Destination pending')+' · '+esc(s.carrier||'Carrier pending')+'</small></div><span>'+badge(s.order_status)+'</span><b>'+Number(s.percent_complete||0)+'%</b></div>').join(''):'<div class="atc-empty">No shipments found.</div>';
    document.getElementById('atc-docs').innerHTML=d.documents.length?d.documents.map(x=>'<div class="atc-row"><div><b>'+esc(x.doc_type.replace(/_/g,' '))+'</b><small>'+esc(x.file_name)+' · '+esc(x.owner_name)+'</small></div><span>'+badge(x.status)+'</span></div>').join(''):'<div class="atc-empty">No documents found.</div>';
  }
  async function loadLedger(){
    const box=document.getElementById('atc-ledger');
    if(!box)return;
    try{
      const r=await fetch('/api/payments/ledger',{headers:{Authorization:'Bearer '+token}});
      const j=await r.json();
      if(!r.ok)throw Error(j.error?.message||j.message||'Unable to load settlement ledger');
      const rows=j.ledger||[];
      const totals=rows.reduce((a,x)=>{const n=Number(x.amount||0);const k=x.entry_type==='refund'?'refund':'settlement';a[k][x.currency]=(a[k][x.currency]||0)+n;return a},{settlement:{},refund:{}});
      const sum=o=>Object.entries(o).map(([c,n])=>esc(c)+' '+fmt(n)).join(' · ')||'0';
      box.innerHTML='<div class="atc-ledger-summary"><span><b>Settlements</b> '+sum(totals.settlement)+'</span><span><b>Refunds</b> '+sum(totals.refund)+'</span></div>'+
        (rows.length?rows.map(x=>'<div class="atc-ledger-row"><div><b>'+esc(x.order_reference||'Unlinked payment')+'</b><small>'+esc(String(x.method||'').toUpperCase())+' · '+esc(x.provider_ref||'No provider ref')+' · '+new Date(x.created_at).toLocaleString()+'</small></div><span class="atc-badge">'+esc(x.entry_type)+'</span><b>'+esc(x.currency)+' '+fmt(x.amount)+'</b></div>').join(''):'<div class="atc-empty">No settlement or refund entries recorded.</div>')+
        '<p class="atc-provider-note">Internal VTG reconciliation record only. This ledger does not prove that external funds moved or settled through a licensed provider.</p>';
    }catch(e){box.innerHTML='<div class="atc-empty">'+esc(e.message)+'</div>'}
  }
  async function trail(id){try{const r=await fetch('/api/payments/'+encodeURIComponent(id)+'/reconciliation',{headers:{Authorization:'Bearer '+token}});const j=await r.json();if(!r.ok)throw Error(j.error?.message||j.message||'Unable to load finance trail');const p=j.payment||{},h=j.history||[],l=j.ledger||[],a=j.audit||[];let box=document.getElementById('atc-finance-trail');if(!box){box=document.createElement('div');box.id='atc-finance-trail';box.style.cssText='position:fixed;inset:6% 5%;z-index:9999;overflow:auto;padding:20px;background:var(--white,#fff);box-shadow:0 20px 60px rgba(0,0,0,.25);border-radius:16px';document.body.appendChild(box)}const hist=h.length?h.map(x=>'<div style="padding:12px;border-left:3px solid var(--accent,#8f1d17);margin:0 0 8px 4px"><b>'+esc(x.to_status||'status')+'</b> '+(x.from_status?'from '+esc(x.from_status):'created')+'<br><small>'+esc(x.actor_name||'System')+' • '+new Date(x.created_at).toLocaleString()+' • '+esc(x.note||'')+'</small></div>').join(''):'<div class="atc-row">No status history recorded.</div>';const audit=a.length?a.map(x=>'<div style="padding:8px 0;border-bottom:1px solid var(--line,#ddd)"><b>'+esc(x.action||'Audit event')+'</b><br><small>'+esc(x.detail||'')+' • '+esc(x.actor_name||'System')+' • '+new Date(x.created_at).toLocaleString()+'</small></div>').join(''):'<div class="atc-row">No matching audit events recorded.</div>';box.innerHTML='<div class="atc-row"><div><h3 style="margin:0">Finance Trail</h3><small>'+esc(String(p.method||'').toUpperCase())+' • '+esc(p.status)+' • '+esc(p.currency)+' '+fmt(p.amount)+'</small></div><button class="atc-trail" id="atc-trail-close">Close</button></div><div class="atc-row">Workflow record only unless a licensed live provider is explicitly connected. It does not by itself prove external funds moved.</div><p><b>Order:</b> '+esc(p.order_reference||'—')+' • '+esc(p.order_status||'—')+'<br><b>LC:</b> '+esc(p.lc_reference||'Not linked')+' • '+esc(p.lc_status||'—')+'</p><h4>Status timeline</h4>'+hist+'<h4>Internal settlement ledger</h4>'+(l.length?l.map(x=>'<div style="padding:10px;border:1px solid var(--line,#ddd);border-radius:10px;margin:0 0 8px"><b>'+esc(x.entry_type||'entry')+'</b> · '+esc(x.currency)+' '+fmt(x.amount)+'<br><small>'+esc(x.note||'')+' • '+new Date(x.created_at).toLocaleString()+'</small></div>').join(''):'<div class="atc-row">No internal ledger entry recorded.</div>')+'<h4>Audit events</h4>'+audit;box.querySelector('#atc-trail-close').onclick=()=>box.remove()}catch(e){alert(e.message)}}
document.addEventListener('click',e=>{const b=e.target.closest('.atc-trail');if(b)trail(b.dataset.paymentId)});
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('atc-refresh').onclick=()=>load().catch(e=>{document.getElementById('atc-error').textContent=e.message;document.getElementById('atc-error').hidden=false});load().catch(e=>{document.getElementById('atc-error').textContent=e.message;document.getElementById('atc-error').hidden=false})});
})();