(() => {
  const PRODUCTS = [
    { name: 'Premium Vehicles', tag: 'Cars • SUVs • Commercial vehicles', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Industrial Machinery', tag: 'Factory • Processing • Heavy equipment', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Electronics & Technology', tag: 'Devices • Components • Smart equipment', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Agriculture & Agro Equipment', tag: 'Machinery • Inputs • Produce', img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Pharmaceutical & Medical', tag: 'Medicines • Equipment • Healthcare supplies', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Construction & Building', tag: 'Materials • Tools • Engineering equipment', img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Textiles & Consumer Goods', tag: 'Fashion • Fabrics • Household products', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Shipping & Logistics', tag: 'Containers • Freight • Port services', img: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1600&auto=format&fit=crop' }
  ];

  const escapeHtml = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

  function loadRepairScript() {
    if (document.querySelector('script[data-vtg-ui-repair]')) return;
    const s = document.createElement('script');
    s.src = '/vtg-ui-repair.js?v=3';
    s.dataset.vtgUiRepair = '1';
    s.defer = true;
    document.head.appendChild(s);
  }

  async function loadLiveMarket() {
    try {
      const r = await fetch('/api/market/dashboard', { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('market feed unavailable');
      const d = await r.json();
      const news = Array.isArray(d.news) ? d.news : [];
      if (!news.length) return;

      const ticker = document.querySelector('.ticker span');
      if (ticker) ticker.textContent = news.slice(0, 10).map(x => x.title).join(' • ');

      const previewItems = [...document.querySelectorAll('.newsItem')];
      news.slice(0, 2).forEach((item, i) => {
        const row = previewItems[i];
        if (!row) return;
        const title = row.querySelector('b');
        const meta = row.querySelector('small');
        if (title) title.textContent = item.title || 'Current trade-market signal';
        if (meta) meta.textContent = (item.source || 'VTG market feed') + ' • ' + new Date(item.published || Date.now()).toLocaleDateString();
        if (item.image && row.querySelector('img')) row.querySelector('img').src = item.image;
      });

      const list = document.querySelector('.newsLarge');
      if (list) {
        list.innerHTML = news.slice(0, 8).map(item => `
          <article>
            ${item.image ? `<img loading="lazy" decoding="async" src="${escapeHtml(item.image)}" alt="Trade market news">` : ''}
            <div>
              <h3>${escapeHtml(item.title || 'Current trade-market update')}</h3>
              <p>${escapeHtml(item.description || 'Current trade information from the VTG market feed.')}</p>
              <span class="newsSource">${escapeHtml(item.source || 'VTG market feed')}</span>
            </div>
          </article>`).join('');
      }
    } catch (e) {
      console.warn('VTG live market feed unavailable; keeping page fallback content', e);
    }
  }

  function upgradeAI() {
    const form = document.querySelector('#aiForm');
    const input = document.querySelector('#aiInput');
    const msgs = document.querySelector('#aiMsgs');
    if (!form || !input || !msgs || form.dataset.vtgAiEnhanced) return;
    form.dataset.vtgAiEnhanced = '1';

    const history = [];
    const original = form.onsubmit;
    form.onsubmit = async e => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const add = (role, text) => {
        const d = document.createElement('div');
        d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
        d.textContent = text;
        msgs.appendChild(d);
        msgs.scrollTop = msgs.scrollHeight;
      };
      add('user', q);
      input.value = '';
      history.push({ role: 'user', content: q });
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const r = await fetch('/api/ai/public-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            message: q,
            history: history.slice(-20),
            country: 'Nigeria',
            role: localStorage.getItem('vtg_role') || 'buyer',
            live: true,
            currentDate: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            page: location.href
          }),
          signal: controller.signal
        });
        clearTimeout(timer);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'AI request failed');
        const reply = d.reply || d.message || 'I could not generate a response right now.';
        add('assistant', reply);
        history.push({ role: 'assistant', content: reply });
      } catch (err) {
        add('assistant', err.name === 'AbortError' ? 'The current-data request took too long. Please try again.' : 'I’m temporarily unable to connect to the VTG AI service. Please try again shortly.');
      }
    };
    if (typeof original === 'function') {
      // The enhanced handler intentionally replaces the older single-message handler
      // so the live/history-aware v5 behaviour is used only once.
    }
  }

  function enhanceBackendCalculator() {
    const calcDrawer = document.querySelector('#calcDrawer');
    if (!calcDrawer || calcDrawer.dataset.vtgBackendCalc) return;
    const out = calcDrawer.querySelector('#calcOut');
    if (!out) return;
    calcDrawer.dataset.vtgBackendCalc = '1';

    const note = document.createElement('div');
    note.style.cssText = 'margin-top:12px;padding:11px;border:1px solid var(--line);border-radius:12px;background:#f7fbfc;font-size:8px;color:var(--muted);line-height:1.55';
    note.innerHTML = '<strong style="color:var(--navy);font-size:9px">VTG trade engine</strong><br>Use the calculator above for a quick estimate. Final landed-cost calculations should be verified against the current customs classification and statutory charges.';
    out.parentElement.appendChild(note);
  }

  function apply() {
    try {
      const d = document, w = window;
      const ensureIcons = () => {
        try { if (w.lucide && typeof w.lucide.createIcons === 'function') w.lucide.createIcons({ attrs: { 'stroke-width': 1.9 } }); }
        catch (e) { console.warn('VTG icon refresh', e); }
      };
      ensureIcons();
      loadRepairScript();

      const style = d.createElement('style'); style.id = 'vtgVisualEnhancer'; style.textContent = `
      .productHero .copy{z-index:4}
      .tradeCard img,.newsItem img,.newsLarge img,.mini img{background:#e8f1f3}
      .vtgProductStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:13px}
      .vtgProductChip{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:8px;min-width:0}
      .vtgProductChip img{width:44px!important;height:35px!important;object-fit:cover;border-radius:7px;flex:none}
      .vtgProductChip b{display:block;font-size:8px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vtgProductChip small{display:block;color:var(--muted);font-size:6px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      body,body *,button,input,select,textarea{font-family:Arial,Helvetica,sans-serif!important}
      @media(max-width:800px){.vtgProductStrip{grid-template-columns:1fr 1fr}}
      `;
      const oldStyle = d.getElementById('vtgVisualEnhancer'); if (oldStyle) oldStyle.remove(); d.head.appendChild(style);

      const hero = d.querySelector('.productHero');
      // The main product carousel is owned by frontend-v3.html.
      // Do not inject a second carousel over the same hero area.
      // Keep the product strip below the hero as a separate browsing aid.
      if (hero && !d.querySelector('.vtgProductStrip')) {
        const strip = d.createElement('div'); strip.className = 'vtgProductStrip';
        strip.innerHTML = PRODUCTS.slice(0, 8).map(p =>
          '<div class="vtgProductChip"><img loading="lazy" src="' + p.img + '" alt="' + p.name + '"><div><b>' + p.name + '</b><small>' + p.tag + '</small></div></div>'
        ).join('');
        strip.querySelectorAll('img').forEach(img => { img.onerror = () => img.remove(); });
        hero.parentElement.appendChild(strip);
      }

      loadLiveMarket();
      setInterval(loadLiveMarket, 300000);
      upgradeAI();
      setTimeout(enhanceBackendCalculator, 800);
      setTimeout(loadRepairScript, 250);
      ensureIcons();
    } catch (e) { console.warn('VTG visual enhancer failed', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
