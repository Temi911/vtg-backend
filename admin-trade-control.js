(() => {
  const token=localStorage.getItem('vtg_access_token');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>n==null?'—':Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
  const badge=s=>'<span class="atc-badge">'+esc(String(s||'').replace(/_/g,' '))+'</span>';
  async function load(){
    if(!token) throw Error('Please sign in as an administrator.');
    const r=await fetch('/api/admin/trade/overview',{headers:{Authorization:'Bearer '+token}});
    const j=await r.json();if(!r.ok)throw Error(j.error?.message||j.message||'Unable to load trade control');
    render(j);
  }
  function render(d){
    const k=document.getElementById('atc-kpis');
    k.innerHTML=[['Open orders',d.summary.openOrders],['LC records',d.summary.lcs],['Payment records',d.summary.payments],['Active shipments',d.summary.activeShipments]]
      .map(x=>'<div class="atc-card"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join('');
    document.getElementById('atc-orders').innerHTML=d.orders.length?d.orders.map(o=>'<div class="atc-row"><div><b>'+esc(o.reference)+'</b><small>'+esc(o.buyer_name)+' → '+esc(o.supplier_name)+'</small></div><span>'+badge(o.status)+'</span><b>$'+fmt(o.total_amount_usd)+'</b></div>').join(''):'<div class="atc-empty">No orders found.</div>';
    document.getElementById('atc-lcs').innerHTML=d.lcs.length?d.lcs.map(x=>'<div class="atc-row"><div><b>'+esc(x.reference)+'</b><small>'+esc(x.order_reference)+' · '+esc(x.issuing_bank_name||'Bank not assigned')+'</small></div><span>'+badge(x.status)+'</span><b>$'+fmt(x.amount_usd)+'</b></div>').join(''):'<div class="atc-empty">No letters of credit found.</div>';
    document.getElementById('atc-payments').innerHTML=d.payments.length?d.payments.map(p=>'<div class="atc-row"><div><b>'+esc(String(p.method||'').toUpperCase())+'</b><small>'+esc(p.order_reference||'No linked order')+' · '+esc(p.provider_ref||'Pending provider ref')+'</small></div><span>'+badge(p.status)+'</span><b>'+fmt(p.amount)+' '+esc(p.currency)+'</b></div>').join(''):'<div class="atc-empty">No payment records found.</div>';
    document.getElementById('atc-shipments').innerHTML=d.shipments.length?d.shipments.map(s=>'<div class="atc-row"><div><b>'+esc(s.order_reference)+'</b><small>'+esc(s.origin_port||'Origin pending')+' → '+esc(s.destination_port||'Destination pending')+' · '+esc(s.carrier||'Carrier pending')+'</small></div><span>'+badge(s.order_status)+'</span><b>'+Number(s.percent_complete||0)+'%</b></div>').join(''):'<div class="atc-empty">No shipments found.</div>';
    document.getElementById('atc-docs').innerHTML=d.documents.length?d.documents.map(x=>'<div class="atc-row"><div><b>'+esc(x.doc_type.replace(/_/g,' '))+'</b><small>'+esc(x.file_name)+' · '+esc(x.owner_name)+'</small></div><span>'+badge(x.status)+'</span></div>').join(''):'<div class="atc-empty">No documents found.</div>';
  }
  async function trail(id){try{const r=await fetch('/api/payments/'+encodeURIComponent(id)+'/reconciliation',{headers:{Authorization:'Bearer '+token}});const j=await r.json();if(!r.ok)throw Error(j.error?.message||j.message||'Unable to load finance trail');const p=j.payment||{},a=j.audit||[];alert('Finance trail\\n\\n'+String(p.method||'').toUpperCase()+' '+p.status+'\\nOrder: '+(p.order_reference||'—')+' ('+(p.order_status||'—')+')\\nLC: '+(p.lc_reference||'Not linked')+' ('+(p.lc_status||'—')+')\\nAudit events: '+a.length+'\\n\\n'+a.map(x=>(x.action||'Event')+' — '+(x.detail||'')).join('\\n'));}catch(e){alert(e.message)}}
document.addEventListener('click',e=>{const b=e.target.closest('.atc-trail');if(b)trail(b.dataset.paymentId)});
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('atc-refresh').onclick=()=>load().catch(e=>{document.getElementById('atc-error').textContent=e.message;document.getElementById('atc-error').hidden=false});load().catch(e=>{document.getElementById('atc-error').textContent=e.message;document.getElementById('atc-error').hidden=false})});
})();