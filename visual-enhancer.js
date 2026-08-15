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
      .vtgSupplierCarousel{position:absolute;inset:0;z-index:1;border-radius:20px;overflow:hidden;background:#0a2a40}
      .vtgSupplierCarousel img{position:absolute!important;inset:0;width:100%!important;height:100%!important;object-fit:cover!important;opacity:0;transition:opacity .8s ease,transform 7s ease;transform:scale(1.03)}
      .vtgSupplierCarousel img.active{opacity:.62;transform:scale(1)}
      .vtgSupplierOverlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,26,41,.28),rgba(5,26,41,.05) 55%,rgba(5,26,41,.28));pointer-events:none}
      .vtgSupplierDots{position:absolute;right:18px;top:18px;z-index:3;display:flex;gap:5px}
      .vtgSupplierDots span{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.5);transition:.2s;cursor:pointer}.vtgSupplierDots span.active{width:22px;border-radius:5px;background:#fff}
      .vtgSupplierInfo{position:absolute;left:20px;top:18px;z-index:3;padding:7px 10px;border-radius:9px;background:rgba(7,31,48,.72);color:#fff;font-size:8px;font-weight:800;letter-spacing:.04em;backdrop-filter:blur(8px)}
      .productHero .copy{z-index:4}
      .tradeCard img,.newsItem img,.newsLarge img,.mini img{background:#e8f1f3}
      .vtgProductStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:13px}
      .vtgProductChip{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:8px;min-width:0}
      .vtgProductChip img{width:44px!important;height:35px!important;object-fit:cover;border-radius:7px;flex:none}
      .vtgProductChip b{display:block;font-size:8px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vtgProductChip small{display:block;color:var(--muted);font-size:6px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      body,body *,button,input,select,textarea{font-family:Arial,Helvetica,sans-serif!important}
      @media(max-width:800px){.vtgProductStrip{grid-template-columns:1fr 1fr}.vtgSupplierDots{right:12px}.vtgSupplierInfo{left:12px}}
      `;
      const oldStyle = d.getElementById('vtgVisualEnhancer'); if (oldStyle) oldStyle.remove(); d.head.appendChild(style);

      const hero = d.querySelector('.productHero');
      if (hero && !hero.querySelector('.vtgSupplierCarousel')) {
        const old = hero.querySelector(':scope > img');
        const carousel = d.createElement('div'); carousel.className = 'vtgSupplierCarousel';
        PRODUCTS.forEach((p, i) => {
          const im = d.createElement('img'); im.src = p.img; im.alt = p.name + ' — ' + p.tag;
          im.className = i === 0 ? 'active' : ''; im.loading = i < 2 ? 'eager' : 'lazy';
          im.onerror = () => { im.style.background = 'linear-gradient(135deg,#123b57,#0e969f)'; im.removeAttribute('src'); };
          carousel.appendChild(im);
        });
        const overlay = d.createElement('div'); overlay.className = 'vtgSupplierOverlay'; carousel.appendChild(overlay);
        const dots = d.createElement('div'); dots.className = 'vtgSupplierDots';
        PRODUCTS.forEach((_, i) => { const s = d.createElement('span'); if (i === 0) s.className = 'active'; dots.appendChild(s); });
        carousel.appendChild(dots);
        const info = d.createElement('div'); info.className = 'vtgSupplierInfo'; info.textContent = 'SUPPLIER SHOWCASE • GLOBAL PRODUCTS'; carousel.appendChild(info);
        if (old) old.remove();
        hero.prepend(carousel);
        const title = hero.querySelector('.copy h3'), para = hero.querySelector('.copy p'); let i = 0;
        const update = () => {
          const p = PRODUCTS[i];
          carousel.querySelectorAll('img').forEach((x, n) => x.classList.toggle('active', n === i));
          dots.querySelectorAll('span').forEach((x, n) => x.classList.toggle('active', n === i));
          if (title) title.textContent = p.name + ' — supplier presence.';
          if (para) para.textContent = p.tag + '. Upload products, specifications, company media, adverts and videos so buyers can discover and enquire.';
        };
        update();
        setInterval(() => { i = (i + 1) % PRODUCTS.length; update(); }, 4200);
        dots.querySelectorAll('span').forEach((s, n) => s.onclick = () => { i = n; update(); });
      }

      if (hero && !d.querySelector('.vtgProductStrip')) {
        const strip = d.createElement('div'); strip.className = 'vtgProductStrip';
        PRODUCTS.slice(0, 8).forEach(p => {
          const c = d.createElement('div'); c.className = 'vtgProductChip';
          c.innerHTML = '<img loading="lazy" src="' + p.img + '" alt="' + p.name + '"><div><b>' + p.name + '</b><small>' + p.tag + '</small></div>';
          c.querySelector('img').onerror = () => c.querySelector('img').remove();
          strip.appendChild(c);
        });
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
