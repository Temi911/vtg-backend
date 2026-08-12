(() => {
  'use strict';
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const timeAgo = (value) => {
    const t = Date.parse(value || '');
    if (!Number.isFinite(t)) return 'Recent';
    const m = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    return `${Math.round(h / 24)} day ago`;
  };
  const money = (v, digits = 2) => Number.isFinite(Number(v)) ? Number(v).toLocaleString(undefined, {maximumFractionDigits: digits}) : '—';

  async function loadMarket() {
    try {
      const r = await fetch('/api/market/dashboard', {headers:{Accept:'application/json'}, cache:'no-store'});
      if (!r.ok) throw new Error('Market feed unavailable');
      const data = await r.json();
      renderNews(data.news || []);
      renderPreview(data.news || []);
      renderRates(data.forex, data.crypto);
      window.dispatchEvent(new CustomEvent('vtg:market-ready', {detail:data}));
    } catch (e) {
      document.querySelectorAll('[data-vtg-live-status]').forEach(el => el.textContent = 'Live feed temporarily unavailable');
    }
  }

  function renderNews(items) {
    const wrap = document.querySelector('.newsLarge');
    if (!wrap || !items.length) return;
    wrap.innerHTML = items.slice(0, 8).map(item => `
      <article><div class="liveNewsBody">
        <div class="liveNewsMeta"><span>${esc(item.source || 'Market source')}</span><time>${esc(timeAgo(item.published))}</time></div>
        <h3>${esc(item.title)}</h3>
        <a class="newsSource" href="${esc(item.link || '#')}" target="_blank" rel="noopener noreferrer">Read source <span aria-hidden="true">↗</span></a>
      </div></article>`).join('');
    const ticker = document.querySelectorAll('.ticker span');
    const text = items.slice(0, 8).map(x => x.title).join(' • ');
    ticker.forEach(x => x.textContent = text || 'Global trade • China trade • Vehicles • Freight • Ports • FX');
  }

  function renderPreview(items) {
    const list = document.querySelectorAll('.newsPreview .newsItem');
    if (!list.length || !items.length) return;
    items.slice(0, 2).forEach((item, i) => {
      const row = list[i]; if (!row) return;
      const img = row.querySelector('img'), b = row.querySelector('b'), small = row.querySelector('small');
      if (img) { img.removeAttribute('src'); img.alt = 'Live market news'; }
      if (b) b.textContent = item.title;
      if (small) small.textContent = `${item.source || 'Market source'} • ${timeAgo(item.published)}`;
    });
  }

  function renderRates(fx, crypto) {
    const rates = document.querySelectorAll('.rate');
    if (!rates.length) return;
    const r = fx?.rates || {}, btc = crypto?.prices?.bitcoin, eth = crypto?.prices?.ethereum;
    const values = [
      ['USD / NGN', r.NGN ? money(r.NGN) : '—', fx?.source || 'Live FX'],
      ['USD / CNY', r.CNY ? money(r.CNY) : '—', fx?.source || 'Live FX'],
      ['BTC / USD', btc?.usd ? `$${money(btc.usd,0)}` : '—', btc?.usd_24h_change != null ? `${btc.usd_24h_change >= 0 ? '+' : ''}${Number(btc.usd_24h_change).toFixed(2)}% / 24h` : 'Live crypto'],
      ['ETH / USD', eth?.usd ? `$${money(eth.usd,0)}` : '—', eth?.usd_24h_change != null ? `${eth.usd_24h_change >= 0 ? '+' : ''}${Number(eth.usd_24h_change).toFixed(2)}% / 24h` : 'Live crypto']
    ];
    rates.forEach((el, i) => { const [name, value, note] = values[i] || []; if (!name) return; el.innerHTML = `<b>${esc(name)} <strong>${esc(value)}</strong></b><small>${esc(note)}</small>`; });
  }

  function addCalculator() {
    if (document.getElementById('vtgLandedCost')) return;
    const target = document.querySelector('#intelligence .intelGrid .intelCard:last-child');
    if (!target) return;
    const box = document.createElement('div');
    box.id = 'vtgLandedCost';
    box.innerHTML = `
      <div class="lcHead"><div><span class="eyebrow">VTG trade tool</span><h4>Estimate your landed cost</h4><p>Build a transparent import estimate before requesting a supplier quotation. Government figures remain subject to official classification and assessment.</p></div><span class="lcBadge">ESTIMATE</span></div>
      <form class="lcForm" id="lcForm">
        <div class="lcGrid">
          <label>Product<input name="product" placeholder="e.g. vehicle parts" required></label>
          <label>Destination<select name="country"><option value="Nigeria">Nigeria</option><option value="China">China</option><option value="Ghana">Ghana</option><option value="Kenya">Kenya</option></select></label>
          <label>Origin<input name="origin" value="China" placeholder="Country of origin"></label>
          <label>Currency<select name="currency"><option>USD</option><option>CNY</option><option>EUR</option><option>GBP</option><option>NGN</option></select></label>
          <label>Quantity<input name="quantity" type="number" min="1" step="1" value="1" required></label>
          <label>Unit price<input name="unitPrice" type="number" min="0" step="0.01" value="0" required></label>
          <label>Freight<input name="freight" type="number" min="0" step="0.01" value="0"></label>
          <label>Insurance<input name="insurance" type="number" min="0" step="0.01" value="0"></label>
          <label>Duty rate %<input name="dutyRate" type="number" min="0" max="100" step="0.1" value="20"></label>
          <label>VAT rate %<input name="vatRate" type="number" min="0" max="100" step="0.1" value="7.5"></label>
          <label>Other levies<input name="otherLevies" type="number" min="0" step="0.01" value="0"></label>
          <label>Port / service charges<input name="portCharges" type="number" min="0" step="0.01" value="0"></label>
          <label>Clearing fee<input name="clearingFee" type="number" min="0" step="0.01" value="0"></label>
          <label>Inland transport<input name="inlandTransport" type="number" min="0" step="0.01" value="0"></label>
        </div>
        <div class="lcActions"><button class="primary" type="submit"><span>Calculate landed cost</span></button><button class="outline" type="button" id="lcReset">Reset</button></div>
        <div class="lcStatus" id="lcStatus" role="status"></div>
      </form>
      <div class="lcResult" id="lcResult" hidden></div>
    `;
    target.appendChild(box);
    const form = document.getElementById('lcForm');
    const result = document.getElementById('lcResult');
    const status = document.getElementById('lcStatus');
    const reset = document.getElementById('lcReset');
    const show = (label, value) => `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); status.textContent = 'Calculating…'; result.hidden = true;
      const raw = Object.fromEntries(new FormData(form));
      const payload = {...raw, quantity:Number(raw.quantity), unitPrice:Number(raw.unitPrice), freight:Number(raw.freight||0), insurance:Number(raw.insurance||0), dutyRate:Number(raw.dutyRate||0)/100, vatRate:Number(raw.vatRate||0)/100, otherLevies:Number(raw.otherLevies||0), portCharges:Number(raw.portCharges||0), clearingFee:Number(raw.clearingFee||0), inlandTransport:Number(raw.inlandTransport||0)};
      try {
        const response = await fetch('/api/trade/landed-cost',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || data?.error?.message || 'Unable to calculate this estimate.');
        if (!data.supported) throw new Error(data.message || 'This destination is not supported by the statutory calculator yet.');
        const cur = data.currency || raw.currency;
        result.innerHTML = `<div class="lcResultHead"><div><span class="eyebrow">Estimated landed cost</span><h5>${esc(raw.product)}</h5></div><strong>${esc(cur)} ${money(data.estimatedTotalLandedCost)}</strong></div><div class="lcBreakdown">${show('Product value',`${cur} ${money(data.productValue)}`)}${show('Freight',`${cur} ${money(data.freight)}`)}${show('Insurance',`${cur} ${money(data.insurance)}`)}${show(`Customs duty (${Number(data.dutyRate*100).toFixed(1)}%)`,`${cur} ${money(data.duty)}`)}${show(`VAT (${Number(data.vatRate*100).toFixed(1)}%)`,`${cur} ${money(data.vat)}`)}${show('Other levies',`${cur} ${money(data.otherLevies)}`)}${show('Port / service charges',`${cur} ${money(data.portCharges)}`)}${show('Clearing fee',`${cur} ${money(data.clearingFee)}`)}${show('Inland transport',`${cur} ${money(data.inlandTransport)}`)}</div><div class="lcTotal"><span>Estimated total landed cost</span><strong>${esc(cur)} ${money(data.estimatedTotalLandedCost)}</strong></div><p class="lcDisclaimer">Illustrative estimate only. Customs classification, valuation, statutory rates and final government assessment must be verified with the competent authority. VTG service charges are separate from government charges.</p>`;
        result.hidden = false; status.textContent = 'Estimate ready.';
      } catch (error) { status.textContent = error.message || 'Calculation unavailable right now.'; }
    });
    reset.addEventListener('click',()=>{form.reset();result.hidden=true;status.textContent='';});
  }

  const style = document.createElement('style');
  style.textContent = `.liveNewsBody{padding:16px}.liveNewsMeta{display:flex;justify-content:space-between;gap:10px;margin-bottom:7px;font-size:8px;color:#0e969f;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.liveNewsMeta time{color:#7c8f99;font-weight:600}.newsLarge article h3{margin-bottom:9px!important}.newsLarge .newsSource{color:#0e969f;text-decoration:none}.rate b{display:flex;justify-content:space-between;gap:8px}.rate b strong{color:#0e969f;font-weight:800}.lcHead{display:flex;justify-content:space-between;gap:14px;align-items:start;margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}.lcHead h4{font-family:'Playfair Display',serif;font-size:23px;color:var(--navy);margin:6px 0}.lcHead p{font-size:9px;line-height:1.55;color:var(--muted);max-width:560px;margin:0}.lcBadge{font-size:7px;font-weight:800;letter-spacing:.1em;color:var(--teal);background:var(--soft);border-radius:999px;padding:6px 9px;white-space:nowrap}.lcForm{margin-top:14px}.lcGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.lcGrid label{font-size:8px;font-weight:800;color:#4f6878}.lcGrid input,.lcGrid select{display:block;width:100%;margin-top:5px;border:1px solid var(--line);border-radius:9px;padding:9px;background:#fff;font-size:9px;color:var(--ink)}.lcActions{display:flex;gap:8px;margin-top:13px}.lcActions button{font-size:9px}.lcStatus{font-size:8px;color:var(--teal);min-height:15px;margin-top:8px}.lcResult{margin-top:14px;border:1px solid var(--line);border-radius:14px;background:#f7fbfc;padding:14px}.lcResultHead{display:flex;justify-content:space-between;gap:15px;align-items:end}.lcResultHead h5{font-family:'DM Sans';font-size:14px;color:var(--navy);margin:4px 0 0}.lcResultHead>strong{font-size:17px;color:var(--teal);white-space:nowrap}.lcBreakdown{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:13px}.lcBreakdown>div{background:#fff;border:1px solid var(--line);border-radius:9px;padding:8px}.lcBreakdown small{display:block;font-size:7px;color:var(--muted)}.lcBreakdown strong{display:block;font-size:9px;margin-top:3px}.lcTotal{display:flex;justify-content:space-between;gap:10px;margin-top:10px;padding:11px;border-radius:10px;background:var(--deep);color:#fff;font-size:9px}.lcTotal strong{color:#8cf3ff}.lcDisclaimer{font-size:7px;line-height:1.55;color:var(--muted);margin:10px 0 0}@media(max-width:700px){.lcGrid,.lcBreakdown{grid-template-columns:1fr 1fr}.lcHead{flex-direction:column}.lcResultHead{align-items:start;flex-direction:column}}@media(max-width:450px){.lcGrid,.lcBreakdown{grid-template-columns:1fr}}`;
  document.head.appendChild(style);

  window.VTGMarket = {refresh: loadMarket};
  document.addEventListener('DOMContentLoaded', () => {
    addCalculator();
    const newsDrawer = document.getElementById('newsDrawer');
    if (newsDrawer) {
      const observer = new MutationObserver(() => { if (newsDrawer.classList.contains('open')) loadMarket(); });
      observer.observe(newsDrawer, {attributes:true, attributeFilter:['class']});
    }
    document.getElementById('newsBtn')?.addEventListener('click', () => setTimeout(loadMarket, 0), {once:true});
    document.getElementById('newsOpen')?.addEventListener('click', () => setTimeout(loadMarket, 0), {once:true});
    document.getElementById('heroNews')?.addEventListener('click', () => setTimeout(loadMarket, 0), {once:true});
  });
})();