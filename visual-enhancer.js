(() => {
  const PRODUCTS = [
    { name: 'Pharmaceutical & Medical', tag: 'Medicines • Medical equipment • Healthcare supplies', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Agriculture & Agro Equipment', tag: 'Farm machinery • Inputs • Produce', img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Textiles & Consumer Goods', tag: 'Fashion • Fabrics • Household products', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Electronics & Technology', tag: 'Devices • Components • Smart equipment', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Industrial Machinery', tag: 'Factory • Processing • Heavy equipment', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Construction & Building', tag: 'Materials • Tools • Engineering equipment', img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Shipping & Logistics', tag: 'Containers • Freight • Port services', img: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1600&auto=format&fit=crop' },
    { name: 'Vehicles', tag: 'Cars • SUVs • Commercial vehicles', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=85&w=1600&auto=format&fit=crop' }
  ];

  const escapeHtml = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

  function loadRepairScript() {
    if (document.querySelector('script[data-vtg-ui-repair]')) return;
    const s = document.createElement('script');
    s.src = '/vtg-ui-repair.js?v=4';
    s.dataset.vtgUiRepair = '1';
    s.defer = true;
    document.head.appendChild(s);
  }

  function fixLogo() {
    document.querySelectorAll('img[src*="vtg-logo-red-transparent.png"]').forEach(img => {
      const base = '/assets/vtg-logo-red-transparent.png';
      if (!img.src.includes('?vtg-logo=')) img.src = base + '?vtg-logo=20260925';
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
    });
  }

  function initProductCarousel() {
    const hero = document.querySelector('.productHero');
    if (!hero || hero.dataset.vtgCarouselFixed === '1') return;
    const images = [...hero.querySelectorAll('img')];
    if (!images.length) return;

    hero.dataset.vtgCarouselFixed = '1';

    const slides = PRODUCTS.map((p, i) => {
      const img = document.createElement('img');
      img.decoding = 'async';
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.alt = p.name;
      img.src = p.img;
      return img;
    });

    images.forEach(img => img.remove());
    slides.forEach((img, i) => {
      img.className = i === 0 ? 'active' : '';
      hero.insertBefore(img, hero.firstChild);
    });

    let badge = hero.querySelector('#productCatBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'productCatBadge';
      badge.className = 'catBadge';
      hero.appendChild(badge);
    }
    badge.textContent = PRODUCTS[0].name;

    let copy = hero.querySelector('.copy');
    if (!copy) {
      copy = document.createElement('div');
      copy.className = 'copy';
      hero.appendChild(copy);
    }
    copy.innerHTML = '<h3>Discover what moves across borders.</h3><p>Browse internationally traded products across verified suppliers and trade categories.</p>';

    let index = 0;
    const show = next => {
      slides[index].classList.remove('active');
      index = next;
      slides[index].classList.add('active');
      badge.textContent = PRODUCTS[index].name;
    };

    setInterval(() => show((index + 1) % slides.length), 4500);
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
      add('user', q); input.value = ''; history.push({ role: 'user', content: q });
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const r = await fetch('/api/ai/public-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ message:q, history:history.slice(-20), country:'Nigeria', role:localStorage.getItem('vtg_role')||'buyer', live:true, currentDate:new Date().toISOString(), timezone:Intl.DateTimeFormat().resolvedOptions().timeZone, page:location.href }),
          signal: controller.signal
        });
        clearTimeout(timer);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'AI request failed');
        const reply = d.reply || d.message || 'I could not generate a response right now.';
        add('assistant', reply); history.push({ role:'assistant', content:reply });
      } catch (err) {
        add('assistant', err.name === 'AbortError' ? 'The current-data request took too long. Please try again.' : 'I’m temporarily unable to connect to the VTG AI service. Please try again shortly.');
      }
    };
  }

  function apply() {
    const d = document, w = window;
    try {
      const style = d.createElement('style');
      style.id = 'vtgVisualEnhancer';
      style.textContent = `
        .productHero .copy{z-index:4}
        .productHero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .7s ease}
        .productHero>img.active{opacity:.94}
        .productHero .catBadge{z-index:5}
        .vtgProductStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:13px}
        .vtgProductChip{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:8px;min-width:0}
        .vtgProductChip img{width:44px!important;height:35px!important;object-fit:cover;border-radius:7px;flex:none}
        .vtgProductChip b{display:block;font-size:8px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .vtgProductChip small{display:block;color:var(--muted);font-size:6px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        @media(max-width:800px){.vtgProductStrip{grid-template-columns:1fr 1fr}}
      `;
      d.getElementById('vtgVisualEnhancer')?.remove();
      d.head.appendChild(style);

      fixLogo();
      initProductCarousel();
      loadRepairScript();
      upgradeAI();
      loadLiveMarket();
      setInterval(loadLiveMarket, 300000);
      setTimeout(() => { fixLogo(); initProductCarousel(); loadRepairScript(); }, 1000);
      setTimeout(() => { if(w.lucide?.createIcons) w.lucide.createIcons({attrs:{'stroke-width':1.9}}); }, 250);
    } catch (e) { console.warn('VTG visual enhancer failed', e); }
  }

  if (dReady()) document.addEventListener('DOMContentLoaded', apply, { once:true });
  else apply();

  function dReady() { return document.readyState !== 'loading'; }
})();