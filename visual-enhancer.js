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


  function buildCategoryCarousels() {
    const hero = document.querySelector('.productHero');
    if (!hero || document.querySelector('.vtgCategorySection')) return;

    const imgs = [...hero.querySelectorAll('img')];
    if (!imgs.length) return;

    const categories = imgs.map((img, i) => ({
      name: img.alt || 'Trade category',
      img: img.currentSrc || img.src,
      index: i
    }));

    const groups = [
      { title: 'Vehicles & Mobility', items: categories.slice(3, 6) },
      { title: 'Fashion, Footwear & Accessories', items: categories.slice(2, 3).concat(categories.slice(7, 15)) },
      { title: 'Industry, Construction & Materials', items: categories.slice(15, 18).concat(categories.slice(27, 28)) },
      { title: 'Home, Consumer & Lifestyle', items: categories.slice(18, 22).concat(categories.slice(24, 27)) },
      { title: 'Business, Energy & Essential Supplies', items: categories.slice(22, 24).concat(categories.slice(28, 30)) },
      { title: 'Agriculture, Medical & Technology', items: categories.slice(0, 2).concat(categories.slice(6, 7)) }
    ];

    const section = document.createElement('div');
    section.className = 'vtgCategorySection';
    section.innerHTML = groups.map((group, gi) => {
      const cards = group.items.map(item => `
        <button class="vtgCategoryCard" type="button" data-category-index="${item.index}">
          <img loading="lazy" decoding="async" src="${item.img}" alt="${item.name}">
          <span>${item.name}</span>
        </button>`).join('');
      return `
        <section class="vtgCategoryCarousel" aria-label="${group.title}">
          <div class="vtgCategoryHead">
            <h3>${group.title}</h3>
            <div class="vtgCategoryControls">
              <button type="button" class="vtgCatPrev" aria-label="Previous categories">‹</button>
              <button type="button" class="vtgCatNext" aria-label="Next categories">›</button>
            </div>
          </div>
          <div class="vtgCategoryTrack">${cards}</div>
        </section>`;
    }).join('');

    hero.parentElement.insertBefore(section, hero.nextElementSibling);

    section.querySelectorAll('.vtgCategoryCarousel').forEach(row => {
      const track = row.querySelector('.vtgCategoryTrack');
      row.querySelector('.vtgCatPrev').onclick = () => track.scrollBy({left: -Math.max(280, track.clientWidth * .7), behavior:'smooth'});
      row.querySelector('.vtgCatNext').onclick = () => track.scrollBy({left: Math.max(280, track.clientWidth * .7), behavior:'smooth'});
    });

    section.querySelectorAll('.vtgCategoryCard').forEach(card => {
      card.onclick = () => {
        const i = Number(card.dataset.categoryIndex);
        const slides = [...hero.querySelectorAll('img')];
        if (!slides[i]) return;
        slides.forEach(x => x.classList.remove('active'));
        slides[i].classList.add('active');
        const badge = hero.querySelector('#productCatBadge');
        if (badge) badge.textContent = slides[i].alt || 'Trade category';
        hero.scrollIntoView({behavior:'smooth', block:'center'});
      };
      const img = card.querySelector('img');
      img.onerror = () => { card.style.display = 'none'; };
    });
  }

  function apply() {
    const d = document, w = window;
    try {
      const style = d.createElement('style');
      style.id = 'vtgVisualEnhancer';
      style.textContent = `
        .productHero .copy{z-index:4}
        .vtgCategorySection{margin-top:18px;display:grid;gap:22px}
        .vtgCategoryCarousel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 14px 16px;overflow:hidden}
        .vtgCategoryHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px}
        .vtgCategoryHead h3{margin:0;color:var(--navy);font-size:16px}
        .vtgCategoryControls{display:flex;gap:6px}
        .vtgCategoryControls button{width:32px;height:32px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--navy);font-size:22px;line-height:1;cursor:pointer}
        .vtgCategoryTrack{display:flex;gap:11px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:3px}
        .vtgCategoryTrack::-webkit-scrollbar{display:none}
        .vtgCategoryCard{flex:0 0 180px;min-height:125px;padding:0;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:#fff;text-align:left;cursor:pointer;scroll-snap-align:start}
        .vtgCategoryCard img{display:block;width:100%;height:88px;object-fit:cover}
        .vtgCategoryCard span{display:block;padding:8px 9px;font-size:9px;line-height:1.3;font-weight:800;color:var(--navy)}
        .vtgCategoryCard:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(20,20,20,.08)}
        @media(max-width:600px){.vtgCategoryCard{flex-basis:155px}.vtgCategoryHead h3{font-size:14px}}
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
      buildCategoryCarousels();
      loadRepairScript();
      upgradeAI();
      loadLiveMarket();
      setInterval(loadLiveMarket, 300000);
      setTimeout(() => { fixLogo(); initProductCarousel(); buildCategoryCarousels(); loadRepairScript(); }, 1000);
      setTimeout(() => { if(w.lucide?.createIcons) w.lucide.createIcons({attrs:{'stroke-width':1.9}}); }, 250);
    } catch (e) { console.warn('VTG visual enhancer failed', e); }
  }

  if (dReady()) document.addEventListener('DOMContentLoaded', apply, { once:true });
  else apply();

  function dReady() { return document.readyState !== 'loading'; }
})();