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
      <article>
        <div class="liveNewsBody">
          <div class="liveNewsMeta"><span>${esc(item.source || 'Market source')}</span><time>${esc(timeAgo(item.published))}</time></div>
          <h3>${esc(item.title)}</h3>
          <a class="newsSource" href="${esc(item.link || '#')}" target="_blank" rel="noopener noreferrer">Read source <span aria-hidden="true">↗</span></a>
        </div>
      </article>`).join('');
    const ticker = document.querySelectorAll('.ticker span');
    const text = items.slice(0, 8).map(x => x.title).join(' • ');
    ticker.forEach(x => x.textContent = text || 'Global trade • China trade • Vehicles • Freight • Ports • FX');
  }

  function renderPreview(items) {
    const list = document.querySelectorAll('.newsPreview .newsItem');
    if (!list.length || !items.length) return;
    items.slice(0, 2).forEach((item, i) => {
      const row = list[i]; if (!row) return;
      const img = row.querySelector('img');
      const b = row.querySelector('b');
      const small = row.querySelector('small');
      if (img) { img.removeAttribute('src'); img.alt = 'Live market news'; }
      if (b) b.textContent = item.title;
      if (small) small.textContent = `${item.source || 'Market source'} • ${timeAgo(item.published)}`;
    });
  }

  function renderRates(fx, crypto) {
    const rates = document.querySelectorAll('.rate');
    if (!rates.length) return;
    const r = fx?.rates || {};
    const btc = crypto?.prices?.bitcoin;
    const eth = crypto?.prices?.ethereum;
    const values = [
      ['USD / NGN', r.NGN ? money(r.NGN) : '—', fx?.source || 'Live FX'],
      ['USD / CNY', r.CNY ? money(r.CNY) : '—', fx?.source || 'Live FX'],
      ['BTC / USD', btc?.usd ? `$${money(btc.usd,0)}` : '—', btc?.usd_24h_change != null ? `${btc.usd_24h_change >= 0 ? '+' : ''}${Number(btc.usd_24h_change).toFixed(2)}% / 24h` : 'Live crypto'],
      ['ETH / USD', eth?.usd ? `$${money(eth.usd,0)}` : '—', eth?.usd_24h_change != null ? `${eth.usd_24h_change >= 0 ? '+' : ''}${Number(eth.usd_24h_change).toFixed(2)}% / 24h` : 'Live crypto']
    ];
    rates.forEach((el, i) => {
      const [name, value, note] = values[i] || [];
      if (!name) return;
      el.innerHTML = `<b>${esc(name)} <strong>${esc(value)}</strong></b><small>${esc(note)}</small>`;
    });
  }

  const style = document.createElement('style');
  style.textContent = `.liveNewsBody{padding:16px}.liveNewsMeta{display:flex;justify-content:space-between;gap:10px;margin-bottom:7px;font-size:8px;color:#0e969f;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.liveNewsMeta time{color:#7c8f99;font-weight:600}.newsLarge article h3{margin-bottom:9px!important}.newsLarge .newsSource{color:#0e969f;text-decoration:none}.rate b{display:flex;justify-content:space-between;gap:8px}.rate b strong{color:#0e969f;font-weight:800}`;
  document.head.appendChild(style);
  window.VTGMarket = {refresh: loadMarket};
  document.addEventListener('DOMContentLoaded', () => {
    const newsDrawer = document.getElementById('newsDrawer');
    if (newsDrawer) {
      const observer = new MutationObserver(() => {
        if (newsDrawer.classList.contains('open')) loadMarket();
      });
      observer.observe(newsDrawer, {attributes:true, attributeFilter:['class']});
    }
    // Keep the landing page fast: the first live request happens only after the user opens News.
    document.getElementById('newsBtn')?.addEventListener('click', () => setTimeout(loadMarket, 0), {once:true});
    document.getElementById('newsOpen')?.addEventListener('click', () => setTimeout(loadMarket, 0), {once:true});
    document.getElementById('heroNews')?.addEventListener('click', () => setTimeout(loadMarket, 0), {once:true});
  });
})();
