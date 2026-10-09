(() => {
  'use strict';

  const API = '/api';
  const token = () => localStorage.getItem('vtg_access_token') || '';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  async function api(path, options = {}) {
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
    let cache = {products:[],orders:[],quotes:[],enquiries:[],shipments:[],notifications:[]};

    function openQuote(product) {
      selectedProduct = product;
      document.getElementById('buyerQuoteTitle').textContent = 'Request quote — ' + product.name;
      document.getElementById('buyerQuoteMeta').textContent = (product.supplier_name || 'Supplier') + ' • ' + money(product.unit_price_usd) + ' per unit' + (product.min_order_qty ? ' • MOQ ' + product.min_order_qty : '');
      document.getElementById('buyerQuoteQty').value = 1;
      document.getElementById('buyerQuoteNotes').value = '';
      document.getElementById('buyerQuoteMsg').innerHTML = '';
      modal.classList.add('open');
    }

    async function submitQuote() {
      if (!selectedProduct) return;
      const qty = Math.max(1, Number(document.getElementById('buyerQuoteQty').value) || 1);
      const body = {
        supplierId: selectedProduct.supplier_id,
        items: [{ productId:selectedProduct.id, description:selectedProduct.name, quantity:qty, unitPriceUsd:Number(selectedProduct.unit_price_usd) }],
        incoterm: document.getElementById('buyerQuoteIncoterm').value,
        validityUntil: document.getElementById('buyerQuoteValidity').value || undefined,
        notes: document.getElementById('buyerQuoteNotes').value.trim() || undefined
      };
      const msg = document.getElementById('buyerQuoteMsg');
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
      box.innerHTML = list.slice(0,40).map(p => `
        <article class="buyerProduct">
          <span class="buyerOsBadge">${esc(p.category || 'Trade product')}</span>
          <b>${esc(p.name)}</b>
          <small>${esc(p.supplier_name || 'Verified supplier')} ${p.verified_supplier ? '• Verified' : ''}</small>
          <small>${money(p.unit_price_usd)} / unit ${p.lead_time ? '• '+esc(p.lead_time) : ''}</small>
          <div class="actions"><button class="btn primary" data-quote-id="${esc(p.id)}">Request quote</button><button class="btn" data-enquire-id="${esc(p.id)}">Enquire</button></div>
        </article>`).join('');
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
      box.innerHTML = cache.shipments.slice(0,6).map(s => `
        <div class="buyerOsItem"><div class="row"><strong>${esc(s.reference)}</strong><span class="buyerOsBadge">${esc(s.status)}</span></div>
        <small>${esc(s.originPort || 'Origin')} → ${esc(s.destinationPort || 'Destination')} • ${Number(s.percentComplete)||0}% complete</small>
        <div class="progress" style="margin-top:7px"><i style="width:${Math.max(0,Math.min(100,Number(s.percentComplete)||0))}%"></i></div></div>`).join('');
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
      box.querySelectorAll('[data-tab-action]').forEach(b=>b.onclick=()=>window.showTab?.(b.dataset.tabAction));
    }

    async function refresh() {
      try {
        const [products,orders,quotes,enquiries,shipments,notifications] = await Promise.all([
          api('/products'),
          api('/orders'),
          api('/quotes'),
          api('/marketplace/enquiries/mine'),
          api('/shipments/atlas'),
          api('/notifications')
        ]);
        cache={products:products.products||[],orders:orders.orders||[],quotes:quotes.quotes||[],enquiries:enquiries.enquiries||[],shipments:shipments.shipments||[],notifications:notifications.notifications||[]};
        document.getElementById('buyerOrdersKpi').textContent=cache.orders.length;
        document.getElementById('buyerQuotesKpi').textContent=cache.quotes.filter(q=>!['rejected','expired','converted'].includes(q.status)).length;
        document.getElementById('buyerEnquiriesKpi').textContent=cache.enquiries.length;
        document.getElementById('buyerAlertsKpi').textContent=cache.notifications.filter(n=>!n.read_at).length;
        renderProducts(cache.products);renderActivity();renderShipments();renderNextActions();
      } catch(e) {
        document.getElementById('buyerProducts').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>';
        document.getElementById('buyerActivity').innerHTML='<div class="buyerOsError">Unable to load buyer activity. Your session may need to be refreshed.</div>';
      }
    }

    document.getElementById('buyerRefresh').onclick=refresh;
    document.getElementById('buyerMarketplace').onclick=()=>location.href='/marketplace.html';
    document.getElementById('buyerProductLoad').onclick=filterProducts;
    document.getElementById('buyerProductSearch').addEventListener('input',filterProducts);
    document.getElementById('buyerQuoteCancel').onclick=()=>modal.classList.remove('open');
    document.getElementById('buyerQuoteSubmit').onclick=submitQuote;
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});

    refresh();
  }

  function boot(){ injectStyle(); mount(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();