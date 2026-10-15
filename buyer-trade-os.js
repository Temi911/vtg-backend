(() => {
  'use strict';

  const API = '/api';
  function currentSession(){try{return JSON.parse(localStorage.getItem('vtg-auth')||'null')}catch(_){return null}}
  const token = () => localStorage.getItem('vtg_access_token') || currentSession()?.accessToken || '';
  function isBranchPreviewDeployment(){return location.hostname.toLowerCase().endsWith('.vercel.app')&&location.hostname.toLowerCase()!=='vtg-staging.vercel.app'}
  function canUseLiveBuyerWorkspace(){
    if(isBranchPreviewDeployment()||new URLSearchParams(location.search).get('preview')==='1'||!token())return false;
    const role=currentSession()?.user?.role;
    return !role||role==='buyer';
  }

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  async function api(path, options = {}) {
    if(isBranchPreviewDeployment()) throw new Error('Live buyer API access is disabled in Vercel branch previews because /api targets the production backend.');
    const headers = { ...(options.headers || {}), Authorization: 'Bearer ' + token() };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { ...options, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error?.message || data?.message || 'Request failed');
    return data;
  }

  const money = n => new Intl.NumberFormat(undefined, {
    style:'currency', currency:'USD', maximumFractionDigits:2
  }).format(Number(n) || 0);

  function injectStyle() {
    if (document.getElementById('buyerTradeOsStyle')) return;
    const s = document.createElement('style');
    s.id = 'buyerTradeOsStyle';
    s.textContent = `
      .buyerOs{margin:0 0 16px}
      .buyerOsHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:14px}
      .buyerOsHead h2{margin:4px 0;font-size:22px}
      .buyerOsHead p{margin:0;color:var(--muted);font-size:11px;line-height:1.55}
      .buyerOsActions{display:flex;gap:8px;flex-wrap:wrap}
      .buyerOsKpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
      .buyerOsKpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
      .buyerOsKpi span{display:block;color:var(--muted);font-size:10px}
      .buyerOsKpi b{display:block;font-size:22px;margin:4px 0}
      .buyerOsGrid{display:grid;grid-template-columns:1.25fr .75fr;gap:14px}
      .buyerOsPanel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
      .buyerOsPanel h3{margin:0 0 4px;font-size:15px}
      .buyerOsSub{color:var(--muted);font-size:10px;margin-bottom:12px}
      .buyerOsList{display:grid;gap:8px}
      .buyerOsItem{border:1px solid var(--line);border-radius:11px;padding:11px;background:var(--card)}
      .buyerOsItem .row{align-items:flex-start}
      .buyerOsItem small{display:block;color:var(--muted);font-size:10px;line-height:1.45;margin-top:3px}
      .buyerOsBadge{display:inline-block;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:800;background:#edf8f8;color:#176a70;text-transform:uppercase}
      .buyerOsSearch{display:flex;gap:8px;margin-bottom:10px}
      .buyerOsSearch input,.buyerOsSearch select{min-width:0;flex:1;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card);color:var(--ink)}
      .buyerProductGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-height:430px;overflow:auto}
      .buyerProduct{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--card)}
      .buyerProduct b{font-size:11px}.buyerProduct small{display:block;color:var(--muted);font-size:9px;margin-top:3px}
      .buyerProduct .actions{margin-top:9px}
      .buyerOsEmpty{padding:20px;text-align:center;color:var(--muted);font-size:11px;border:1px dashed var(--line);border-radius:10px}
      .buyerOsError{padding:10px;border-radius:9px;background:#fff1f1;color:#8f3030;font-size:10px}
      .buyerOsModal{position:fixed;inset:0;background:rgba(3,15,20,.55);display:none;place-items:center;z-index:5000;padding:16px}
      .buyerOsModal.open{display:grid}.buyerOsDialog{width:min(520px,100%);max-height:90vh;overflow:auto;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:18px}
      .buyerOsDialog h3{margin:0 0 5px}.buyerOsField{display:grid;gap:5px;margin:10px 0}.buyerOsField label{font-size:9px;font-weight:800;color:var(--muted)}.buyerOsField input,.buyerOsField select,.buyerOsField textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card);color:var(--ink)}
      .buyerOsModalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
      @media(max-width:900px){.buyerOsKpis{grid-template-columns:repeat(2,1fr)}.buyerOsGrid{grid-template-columns:1fr}}
      @media(max-width:560px){.buyerOsKpis{grid-template-columns:1fr 1fr}.buyerProductGrid{grid-template-columns:1fr}.buyerOsHead{flex-direction:column}}
      html[data-theme="dark"] .buyerOsModal{background:rgba(0,0,0,.7)}
      .buyerOsCompare{margin-top:12px}
      .buyerOsCompareGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .buyerOsCompareCard{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--card)}
      .buyerOsCompareCard small{display:block;color:var(--muted);font-size:10px;line-height:1.5;margin-top:4px}
      .buyerOsCostGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .buyerOsCostGrid .buyerOsField{display:grid;gap:5px;margin:0}
      .buyerOsCostGrid .buyerOsField span{font-size:10px;font-weight:700;color:var(--muted)}
      .buyerOsCostGrid input{min-width:0;width:100%;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card);color:var(--ink)}
      @media(max-width:900px){.buyerOsCompareGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.buyerOsCostGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.buyerOsCompareGrid,.buyerOsCostGrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function mount() {
    if (document.getElementById('buyerOs')) return;
    const journey = document.getElementById('vtgTradeJourney');
    if (!journey) return;

    const host = document.createElement('section');
    host.id = 'buyerOs';
    host.className = 'buyerOs';

    host.innerHTML = `
      <div class="buyerOsHead">
        <div>
          <span class="eyebrow">BUYER TRADE OS</span>
          <h2>Your live trade desk</h2>
          <p>Connect sourcing, quote requests, orders, shipments and trade documents to your buyer account. Demo numbers are replaced with your authenticated account data wherever the API has data.</p>
        </div>
        <div class="buyerOsActions">
          <button class="btn primary" id="buyerRefresh">Refresh workspace</button>
          <button class="btn" id="buyerMarketplace">Browse marketplace</button>
          <a class="btn" href="/account-trade-feed.html">Open Trade Feed</a>
        </div>
      </div>
      <div class="buyerOsKpis">
        <div class="buyerOsKpi"><span>My orders</span><b id="buyerOrdersKpi">—</b><span>Buyer orders</span></div>
        <div class="buyerOsKpi"><span>Quote requests</span><b id="buyerQuotesKpi">—</b><span>Open trade quotes</span></div>
        <div class="buyerOsKpi"><span>Enquiries</span><b id="buyerEnquiriesKpi">—</b><span>Supplier conversations</span></div>
        <div class="buyerOsKpi"><span>Unread alerts</span><b id="buyerAlertsKpi">—</b><span>Account notifications</span></div>
      </div>
      <div class="buyerOsGrid">
        <div class="buyerOsPanel">
          <h3>Source products</h3>
          <div class="buyerOsSub">Live supplier catalogue from the VTG products API</div>
          <div class="buyerOsSearch"><input id="buyerProductSearch" placeholder="Search products, categories or suppliers"><button class="btn" id="buyerProductLoad">Search</button></div>
          <div id="buyerProducts" class="buyerProductGrid"><div class="buyerOsEmpty">Loading supplier catalogue…</div></div>
          <div id="buyerCompare" class="buyerOsCompare" aria-live="polite"><div class="buyerOsEmpty">Choose up to three listings to compare supplier status, price, MOQ and lead time.</div></div>
        </div>
        <div class="buyerOsPanel">
          <h3>My trade activity</h3>
          <div class="buyerOsSub">Your latest quotes and orders</div>
          <div id="buyerActivity" class="buyerOsList"><div class="buyerOsEmpty">Loading activity…</div></div>
        </div>
      </div>
      <div class="buyerOsGrid" style="margin-top:14px">
        <div class="buyerOsPanel">
          <h3>Shipment desk</h3>
          <div class="buyerOsSub">Orders that have entered the logistics layer</div>
          <div id="buyerShipments" class="buyerOsList"><div class="buyerOsEmpty">Loading shipments…</div></div>
        </div>
        <div class="buyerOsPanel">
          <h3>Next actions</h3>
          <div class="buyerOsSub">Actions generated from your current trade records</div>
          <div id="buyerNextActions" class="buyerOsList"><div class="buyerOsEmpty">Preparing actions…</div></div>
        </div>
      </div>
      <div class="buyerOsPanel" style="margin-top:14px">
        <h3>Planning landed-cost estimate — Nigeria</h3>
        <div class="buyerOsSub">Enter rates confirmed from a suitable customs source. This is a planning scenario, not a tariff determination or tax assessment.</div>
        <form id="buyerLandedCostForm">
          <div class="buyerOsCostGrid">
            <label class="buyerOsField"><span>Selected product</span><input id="buyerCostProductName" placeholder="Optional description"></label>
            <label class="buyerOsField"><span>Unit price (USD)</span><input id="buyerCostUnitPrice" type="number" min="0.01" step="0.01" required></label>
            <label class="buyerOsField"><span>Quantity</span><input id="buyerCostQuantity" type="number" min="1" step="1" value="1" required></label>
            <label class="buyerOsField"><span>Freight (USD)</span><input id="buyerCostFreight" type="number" min="0" step="0.01" value="0"></label>
            <label class="buyerOsField"><span>Insurance (USD)</span><input id="buyerCostInsurance" type="number" min="0" step="0.01" value="0"></label>
            <label class="buyerOsField"><span>Customs duty rate (%)</span><input id="buyerCostDuty" type="number" min="0" max="100" step="0.01" required></label>
            <label class="buyerOsField"><span>VAT rate (%)</span><input id="buyerCostVat" type="number" min="0" max="100" step="0.01" required></label>
            <label class="buyerOsField"><span>Other levies (USD)</span><input id="buyerCostLevies" type="number" min="0" step="0.01" value="0"></label>
            <label class="buyerOsField"><span>Port charges (USD)</span><input id="buyerCostPort" type="number" min="0" step="0.01" value="0"></label>
            <label class="buyerOsField"><span>Clearing fee (USD)</span><input id="buyerCostClearing" type="number" min="0" step="0.01" value="0"></label>
            <label class="buyerOsField"><span>Inland transport (USD)</span><input id="buyerCostInland" type="number" min="0" step="0.01" value="0"></label>
          </div>
          <div class="buyerOsModalActions"><button class="btn primary" id="buyerCostSubmit" type="submit">Calculate planning estimate</button></div>
        </form>
        <div id="buyerCostResult" class="buyerOsEmpty" role="status" aria-live="polite">No estimate calculated yet.</div>
      </div>
      <div id="buyerOsRefreshMessage" class="buyerOsError" role="status" aria-live="polite" hidden></div>
    `;

    journey.insertAdjacentElement('afterend', host);

    const modal = document.createElement('div');
    modal.id = 'buyerQuoteModal';
    modal.className = 'buyerOsModal';
    modal.innerHTML = `
      <div class="buyerOsDialog">
        <h3 id="buyerQuoteTitle">Request supplier quote</h3>
        <div id="buyerQuoteMeta" class="buyerOsSub"></div>
        <div class="buyerOsField"><label>Quantity</label><input id="buyerQuoteQty" type="number" min="1" step="1" value="1"></div>
        <div class="buyerOsField"><label>Incoterm</label><select id="buyerQuoteIncoterm"><option>FOB</option><option>CIF</option><option>CFR</option><option>EXW</option><option>DDP</option></select></div>
        <div class="buyerOsField"><label>Validity date (optional)</label><input id="buyerQuoteValidity" type="date"></div>
        <div class="buyerOsField"><label>Message / trade notes</label><textarea id="buyerQuoteNotes" rows="4" placeholder="Quantity, destination, specifications or questions for the supplier"></textarea></div>
        <div id="buyerQuoteMsg"></div>
        <div class="buyerOsModalActions"><button class="btn" id="buyerQuoteCancel">Cancel</button><button class="btn primary" id="buyerQuoteSubmit">Send quote request</button></div>
      </div>`;
    document.body.appendChild(modal);

    let selectedProduct = null;
    const compareIds = new Set();
    let cache = {products:[],orders:[],quotes:[],enquiries:[],shipments:[],notifications:[]};

    function openQuote(product) {
      selectedProduct = product;
      document.getElementById('buyerQuoteTitle').textContent = 'Request quote — ' + product.name;
      document.getElementById('buyerQuoteMeta').textContent = (product.supplier_name || 'Supplier') + ' • ' + money(product.unit_price_usd) + ' per unit' + (product.min_order_qty ? ' • MOQ ' + product.min_order_qty : '');
      const quantity = document.getElementById('buyerQuoteQty');
      const minimum = Math.max(1, parseInt(product.min_order_qty, 10) || 1);
      quantity.min = String(minimum);
      quantity.value = String(minimum);
      document.getElementById('buyerQuoteNotes').value = '';
      document.getElementById('buyerQuoteMsg').innerHTML = '';
      modal.classList.add('open');
    }

    async function submitQuote() {
      if (!selectedProduct) return;
      const qty = Number(document.getElementById('buyerQuoteQty').value);
      const minimum = Math.max(1, parseInt(selectedProduct.min_order_qty, 10) || 1);
      const msg = document.getElementById('buyerQuoteMsg');
      if (!Number.isSafeInteger(qty) || qty < minimum) {
        msg.innerHTML = '<div class="buyerOsError">Enter a whole quantity of at least '+minimum+'.</div>';
        return;
      }
      if (selectedProduct.supplier_verification_status !== 'verified') {
        msg.innerHTML = '<div class="buyerOsError">This supplier is not verified for quote requests.</div>';
        return;
      }
      const body = {
        supplierId: selectedProduct.supplier_id,
        items: [{ productId:selectedProduct.id, description:selectedProduct.name, quantity:qty, unitPriceUsd:Number(selectedProduct.unit_price_usd) }],
        incoterm: document.getElementById('buyerQuoteIncoterm').value,
        validityUntil: document.getElementById('buyerQuoteValidity').value || undefined,
        notes: document.getElementById('buyerQuoteNotes').value.trim() || undefined
      };
      msg.innerHTML = '<div class="notice">Sending quote request…</div>';
      try {
        const d = await api('/quotes', {method:'POST', body:JSON.stringify(body)});
        msg.innerHTML = '<div class="notice">Quote <strong>'+esc(d.quote?.reference || '')+'</strong> sent to the supplier.</div>';
        await refresh();
        setTimeout(() => modal.classList.remove('open'), 900);
      } catch (e) {
        msg.innerHTML = '<div class="buyerOsError">'+esc(e.message)+'</div>';
      }
    }

    function renderProducts(list) {
      const box = document.getElementById('buyerProducts');
      if (!list.length) { box.innerHTML='<div class="buyerOsEmpty">No active products matched your search.</div>'; return; }
      box.innerHTML = list.slice(0,40).map(p => {
        const verified = String(p.supplier_verification_status||'').toLowerCase() === 'verified';
        const verification = verified ? 'Verified by VTG' : 'Not verified for order placement';
        return `
        <article class="buyerProduct">
          <span class="buyerOsBadge">${esc(p.category || 'Trade product')}</span>
          <b>${esc(p.name)}</b>
          <small>${esc(p.supplier_name || 'Supplier account')}</small>
          <small>VTG supplier verification: ${verification}</small>
          <small>Rating: ${Number.isFinite(Number(p.rating))&&p.rating!==null?esc(p.rating)+'/5':'Not rated'}</small>
          <small>${money(p.unit_price_usd)} / unit ${p.lead_time ? '• '+esc(p.lead_time) : ''}</small>
          <div class="actions"><button class="btn primary" data-quote-id="${esc(p.id)}" ${verified?'':'disabled title="Quote requests require a supplier verified by VTG"'}>Request quote</button><button class="btn" data-enquire-id="${esc(p.id)}">Enquire</button><button class="btn" data-compare-id="${esc(p.id)}" aria-pressed="${compareIds.has(String(p.id))}">${compareIds.has(String(p.id))?'Remove comparison':'Compare'}</button><button class="btn" data-cost-id="${esc(p.id)}">Estimate cost</button></div>
        </article>`;
      }).join('');
      box.querySelectorAll('[data-quote-id]').forEach(b => b.onclick = () => {
        const p = cache.products.find(x => String(x.id) === b.dataset.quoteId); if (p) openQuote(p);
      });
      box.querySelectorAll('[data-enquire-id]').forEach(b => b.onclick = async () => {
        const p = cache.products.find(x => String(x.id) === b.dataset.enquireId); if (!p) return;
        const subject = 'Product enquiry: ' + p.name;
        const message = 'I am interested in ' + p.name + '. Please share current availability, MOQ, specifications and delivery terms.';
        try { const d=await api('/marketplace/enquiries',{method:'POST',body:JSON.stringify({supplierId:p.supplier_id,productId:p.id,subject,message})}); alert('Enquiry '+(d.enquiry?.reference||'')+' sent.'); await refresh(); }
        catch(e){ alert(e.message); }
      });
      box.querySelectorAll('[data-compare-id]').forEach(b=>b.onclick=()=>toggleComparison(b.dataset.compareId));
      box.querySelectorAll('[data-cost-id]').forEach(b=>b.onclick=()=>{
        const p=cache.products.find(x=>String(x.id)===b.dataset.costId);if(p)estimateProduct(p);
      });
      renderComparison();
    }

    function renderComparison() {
      const box=document.getElementById('buyerCompare');
      const items=cache.products.filter(p=>compareIds.has(String(p.id))).slice(0,3);
      if(!items.length){box.innerHTML='<div class="buyerOsEmpty">Choose up to three listings to compare supplier status, price, MOQ and lead time.</div>';return}
      box.innerHTML='<div class="buyerOsCompareGrid">'+items.map(p=>{
        const verified=String(p.supplier_verification_status||'').toLowerCase()==='verified';
        return '<article class="buyerOsCompareCard"><strong>'+esc(p.name)+'</strong><small>Supplier: '+esc(p.supplier_name||'Supplier account')+'</small><small>VTG verification: '+(verified?'Verified':'Not verified for order placement')+'</small><small>Unit price: '+money(p.unit_price_usd)+'</small><small>MOQ: '+esc(p.min_order_qty||'Not listed')+'</small><small>Lead time: '+esc(p.lead_time||'Not listed')+'</small><small>Rating: '+(Number.isFinite(Number(p.rating))&&p.rating!==null?esc(p.rating)+'/5':'Not rated')+'</small></article>';
      }).join('')+'</div>';
    }

    function toggleComparison(id) {
      const key=String(id);
      if(compareIds.has(key)) compareIds.delete(key);
      else if(compareIds.size>=3){alert('Compare up to three suppliers at a time.');return}
      else compareIds.add(key);
      filterProducts();
    }

    function estimateProduct(product) {
      document.getElementById('buyerCostProductName').value=product.name+' — '+(product.supplier_name||'Supplier account');
      document.getElementById('buyerCostUnitPrice').value=String(Number(product.unit_price_usd)||'');
      const minimum=Math.max(1,parseInt(product.min_order_qty,10)||1);
      document.getElementById('buyerCostQuantity').value=String(minimum);
      document.getElementById('buyerLandedCostForm').scrollIntoView({behavior:'smooth',block:'center'});
    }

    function filterProducts() {
      const q = document.getElementById('buyerProductSearch').value.trim().toLowerCase();
      renderProducts(cache.products.filter(p => [p.name,p.category,p.supplier_name].join(' ').toLowerCase().includes(q)));
    }

    function renderActivity() {
      const box = document.getElementById('buyerActivity');
      const rows = [];
      cache.quotes.slice(0,5).forEach(q => rows.push(`<div class="buyerOsItem"><div class="row"><strong>${esc(q.reference)}</strong><span class="buyerOsBadge">${esc(q.status)}</span></div><small>${esc(q.supplier_name || 'Supplier')} • ${money(q.total_amount_usd)} • quote</small></div>`));
      cache.orders.slice(0,5).forEach(o => rows.push(`<div class="buyerOsItem"><div class="row"><strong>${esc(o.reference)}</strong><span class="buyerOsBadge">${esc(o.status)}</span></div><small>${esc(o.supplier_name || 'Supplier')} • ${money(o.total_amount_usd)} • order</small></div>`));
      box.innerHTML = rows.length ? rows.slice(0,8).join('') : '<div class="buyerOsEmpty">No quotes or orders yet. Start with a supplier product above.</div>';
    }

    function renderShipments() {
      const box = document.getElementById('buyerShipments');
      if (!cache.shipments.length) { box.innerHTML='<div class="buyerOsEmpty">No shipments are connected to your orders yet.</div>'; return; }
      box.innerHTML = cache.shipments.slice(0,6).map(s => {
        const logistics=s.logistics||{};
        const shipment=logistics.shipment||{};
        const order=logistics.order||{};
        const ports=logistics.ports||{};
        const reference=order.reference||s.reference||'Order';
        const status=order.status||s.status||'tracking pending';
        const origin=ports.origin||s.originPort||'Origin';
        const destination=ports.destination||s.destinationPort||'Destination';
        const progress=Math.max(0,Math.min(100,Number(shipment.percentComplete??s.percentComplete)||0));
        return `<div class="buyerOsItem"><div class="row"><strong>${esc(reference)}</strong><span class="buyerOsBadge">${esc(status)}</span></div>
        <small>${esc(origin)} → ${esc(destination)} • ${progress}% complete</small>
        <div class="progress" style="margin-top:7px"><i style="width:${progress}%"></i></div></div>`;
      }).join('');
    }

    function renderNextActions() {
      const box=document.getElementById('buyerNextActions');
      const actions=[];
      const pendingQuotes=cache.quotes.filter(q=>q.status==='accepted');
      const pendingOrders=cache.orders.filter(o=>['pending','confirmed','lc_issued'].includes(o.status));
      if (pendingQuotes.length) actions.push('<div class="buyerOsItem"><strong>Convert an accepted quote</strong><small>You have an accepted quote ready to become an order.</small><button class="btn primary" data-tab-action="trade-room" style="margin-top:7px">Open Trade Room</button></div>');
      if (pendingOrders.length) actions.push('<div class="buyerOsItem"><strong>Review active orders</strong><small>Keep commercial terms, documents and shipment milestones together.</small><button class="btn" data-tab-action="trade-room" style="margin-top:7px">Review orders</button></div>');
      if (!actions.length) actions.push('<div class="buyerOsItem"><strong>Start sourcing</strong><small>Search the live supplier catalogue and request your first quote.</small></div>');
      box.innerHTML=actions.join('');
      box.querySelectorAll('[data-tab-action]').forEach(b=>b.onclick=()=>{
        const target=document.getElementById('buyerTradeRoomLive');
        target?.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }

    async function refresh() {
      const requests=[
        ['products','/products','products'],
        ['orders','/orders','orders'],
        ['quotes','/quotes','quotes'],
        ['enquiries','/marketplace/enquiries/mine','enquiries'],
        ['shipments','/shipments/atlas','shipments'],
        ['notifications','/notifications','notifications']
      ];
      const results=await Promise.allSettled(requests.map(([,path])=>api(path)));
      const failed=[];
      results.forEach((result,index)=>{
        const [key,,field]=requests[index];
        if(result.status==='fulfilled') cache[key]=Array.isArray(result.value[field])?result.value[field]:[];
        else failed.push(requests[index][0]+': '+(result.reason?.message||'Request failed'));
      });
      document.getElementById('buyerOrdersKpi').textContent=cache.orders.length;
      document.getElementById('buyerQuotesKpi').textContent=cache.quotes.filter(q=>!['rejected','expired','converted'].includes(q.status)).length;
      document.getElementById('buyerEnquiriesKpi').textContent=cache.enquiries.length;
      document.getElementById('buyerAlertsKpi').textContent=cache.notifications.filter(n=>!n.read_at).length;
      renderProducts(cache.products);renderActivity();renderShipments();renderNextActions();
      const status=document.getElementById('buyerOsRefreshMessage');
      status.hidden=failed.length===0;
      status.textContent=failed.length?'Some buyer data could not be refreshed: '+failed.join('; '):'';
    }

    document.getElementById('buyerRefresh').onclick=refresh;
    document.getElementById('buyerMarketplace').onclick=()=>location.href='/marketplace.html';
    document.getElementById('buyerProductLoad').onclick=filterProducts;
    document.getElementById('buyerProductSearch').addEventListener('input',filterProducts);
    document.getElementById('buyerQuoteCancel').onclick=()=>modal.classList.remove('open');
    document.getElementById('buyerQuoteSubmit').onclick=submitQuote;
    document.getElementById('buyerLandedCostForm').addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget;
      if(!form.reportValidity())return;
      const byId=id=>document.getElementById(id);
      const resultBox=byId('buyerCostResult');
      const payload={
        country:'NG',destination:'Nigeria',currency:'USD',
        unitPrice:Number(byId('buyerCostUnitPrice').value),
        quantity:Number(byId('buyerCostQuantity').value),
        freight:Number(byId('buyerCostFreight').value)||0,
        insurance:Number(byId('buyerCostInsurance').value)||0,
        dutyRate:Number(byId('buyerCostDuty').value)/100,
        vatRate:Number(byId('buyerCostVat').value)/100,
        otherLevies:Number(byId('buyerCostLevies').value)||0,
        portCharges:Number(byId('buyerCostPort').value)||0,
        clearingFee:Number(byId('buyerCostClearing').value)||0,
        inlandTransport:Number(byId('buyerCostInland').value)||0
      };
      resultBox.textContent='Calculating the Nigeria planning estimate…';
      try{
        const result=await api('/trade/landed-cost',{method:'POST',body:JSON.stringify(payload)});
        if(!result.supported){
          resultBox.textContent=result.message||'A country-specific estimate is not available.';
          return;
        }
        resultBox.innerHTML='<div class="buyerOsItem"><strong>Estimated total landed cost: '+money(result.estimatedTotalLandedCost)+'</strong><small>Product value '+money(result.productValue)+' • CIF '+money(result.cif)+'</small><small>Duty '+money(result.duty)+' • VAT '+money(result.vat)+' • Local charges '+money(result.localCharges)+'</small><small>'+esc(result.methodology||'Planning estimate only; confirm applicable charges with an authorized customs source.')+'</small></div>';
      }catch(error){resultBox.innerHTML='<div class="buyerOsError">'+esc(error.message)+'</div>'}
    });
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});

    refresh();
  }

  function boot(){
    if(new URLSearchParams(location.search).get('preview')==='1')return;
    if(isBranchPreviewDeployment()){
      const anchor=document.getElementById('vtgTradeJourney');
      if(anchor&&!document.getElementById('buyerOsPreviewNotice')){
        const notice=document.createElement('section');notice.id='buyerOsPreviewNotice';notice.className='buyerOs buyerOsPanel';
        notice.innerHTML='<strong>Live buyer records are disabled in this branch preview.</strong><p class="buyerOsSub">This Vercel preview routes API traffic to the production backend. No buyer data is loaded or changed here.</p>';
        anchor.insertAdjacentElement('afterend',notice);
      }
      return;
    }
    if(!canUseLiveBuyerWorkspace())return;
    injectStyle(); mount();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();