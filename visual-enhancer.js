(() => {
  const CATEGORIES = [
    ['Cars & Automobiles','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=85&w=1600&auto=format&fit=crop'],
    ['Motorcycles, Tricycles & Mobility','https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=85&w=1600&auto=format&fit=crop'],
    ['Bicycles & Personal Mobility','https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=85&w=1600&auto=format&fit=crop'],
    ['Pharmaceuticals & Medical Supplies','https://upload.wikimedia.org/wikipedia/commons/2/2f/Standard_First_Aid_Kit_and_Essential_Emergency_Medical_Supplies_14.jpg'],
    ['Agriculture & Farm Products','https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=85&w=1600&auto=format&fit=crop'],
    ['Clothing & Textiles','https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=85&w=1600&auto=format&fit=crop'],
    ['Footwear','https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=85&w=1600&auto=format&fit=crop'],
    ['Fashion & Accessories','https://images.unsplash.com/photo-1558545541-c8e2470bbf71?q=85&w=1600&auto=format&fit=crop'],
    ['Watches & Wearables','https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=85&w=1600&auto=format&fit=crop'],
    ['Electronics & Technology','https://images.unsplash.com/photo-1518770660439-4636190af475?q=85&w=1600&auto=format&fit=crop'],
    ['Home & Furniture','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=85&w=1600&auto=format&fit=crop'],
    ['Kitchen & Home Appliances','https://images.unsplash.com/photo-1556911220-bff31c812dba?q=85&w=1600&auto=format&fit=crop'],
    ['Beauty & Personal Care','https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=85&w=1600&auto=format&fit=crop'],
    ['Food & Beverages','https://images.unsplash.com/photo-1542838132-92c53300491e?q=85&w=1600&auto=format&fit=crop'],
    ['Construction Equipment & Machinery','https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=85&w=1600&auto=format&fit=crop'],
    ['Tools & Hardware','https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=85&w=1600&auto=format&fit=crop'],
    ['Industrial Machinery & Equipment','https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=85&w=1600&auto=format&fit=crop'],
    ['Steel, Iron & Metal Products','https://fluid-line.ru/assets/images/metalloprokat.jpg'],
    ['Solar & Renewable Energy','https://www.sunners.com.br/images/equipamentos-de-energia-solar-fotovoltaica-01.webp'],
    ['Plumbing, Water & Sanitary','https://img.drench.co.uk/social/products/0/e/3/d/0e3d8961a683e2614789e9f09e6017200774ef30_complete_suite_18_v_1_2_3_4_5_6.jpg'],
    ['Packaging & Printing','https://cdn.prod.website-files.com/6799fb467b101943e2504245/6799fb467b101943e2504964_672e0cf14e2e9682142cba4d_5ece9dfe3b049e6ab6e3490e_Schermata%2525202020-05-27%252520alle%25252019.04.50.webp'],
    ['Office & Business Supplies','https://eu.evocdn.io/dealer/1898/content/media/Content_Pages/large-office-supplies-stationery-1.jpg'],
    ['Baby & Children\'s Products','https://ywgimg.yiwugo.com/shop_set/shop_282900/20230914/dR9KtWx7DeydTYEp.jpg'],
    ['Cleaning & Household Supplies','https://radioclub.ua/upload/editor/00/2025/84/e3/6784ffbb147d4_osnovnoe-uborka.jpg'],
    ['Bags, Luggage & Travel','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=85&w=1600&auto=format&fit=crop'],
    ['Retail & Commercial Equipment','https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=85&w=1600&auto=format&fit=crop'],
    ['Hotel, Restaurant & Catering Equipment','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=85&w=1600&auto=format&fit=crop'],
    ['Factory & Production Supplies','https://images.unsplash.com/photo-1565793298595-6a879b1d9492?q=85&w=1600&auto=format&fit=crop'],
    ['Marine & Port Equipment','https://images.unsplash.com/photo-1494412651409-8963ce7935a7?q=85&w=1600&auto=format&fit=crop'],
    ['Logistics, Transport & Warehousing Equipment','https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=85&w=1600&auto=format&fit=crop'],
    ['Building Materials','https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=85&w=1600&auto=format&fit=crop'],
    ['Electrical & Power Equipment','https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=85&w=1600&auto=format&fit=crop'],
    ['Telecommunications & Networking','https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=85&w=1600&auto=format&fit=crop'],
    ['Industrial Materials & Coatings','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=85&w=1600&auto=format&fit=crop'],
    ['General Merchandise','https://images.unsplash.com/photo-1601598851547-4302969d7e26?q=85&w=1600&auto=format&fit=crop'],
    ['Import, Export & Trade Services','https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1600&auto=format&fit=crop']
  ].map(([name,img]) => ({name,img}));

  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function fixLogo() {
    const imgs = document.querySelectorAll('img[src*="vtg-logo-red-transparent.png"], img.brandLogo');
    imgs.forEach(img => {
      img.src = '/assets/vtg-logo-red-transparent.png?vtg-logo=20260925';
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
    });
  }

  function initProductCarousel() {
    const hero = document.querySelector('#productHero');
    if (!hero || hero.dataset.vtgCarouselFixed === '1') return;
    const old = [...hero.querySelectorAll(':scope > img')];
    if (!old.length) return;
    hero.dataset.vtgCarouselFixed = '1';

    const slides = CATEGORIES.map((p,i) => {
      const img = document.createElement('img');
      img.decoding = 'async';
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.alt = p.name;
      img.src = p.img;
      img.className = i === 0 ? 'active' : '';
      img.onerror = () => { img.style.background = 'linear-gradient(135deg,#8f1d17,#c0392b)'; };
      return img;
    });
    old.forEach(x => x.remove());
    slides.forEach(x => hero.insertBefore(x, hero.firstChild));

    const badge = hero.querySelector('#productCatBadge');
    if (badge) badge.textContent = CATEGORIES[0].name;

    let index = 0;
    const show = next => {
      slides[index]?.classList.remove('active');
      index = next;
      slides[index]?.classList.add('active');
      if (badge) badge.textContent = CATEGORIES[index].name;
    };
    clearInterval(window.__vtgHeroTimer);
    window.__vtgHeroTimer = setInterval(() => show((index + 1) % slides.length), 4200);
  }

  function buildCategoryCarousels() {
    const hero = document.querySelector('#productHero');
    if (!hero || document.querySelector('.vtg36Carousels')) return;

    const wrap = document.createElement('div');
    wrap.className = 'vtg36Carousels';

    const imageFor = i => CATEGORIES[(i + CATEGORIES.length) % CATEGORIES.length];
    CATEGORIES.forEach((cat, i) => {
      const related = [i, (i+1)%36, (i+2)%36, (i+3)%36];
      const section = document.createElement('section');
      section.className = 'vtgCategoryCarousel';
      section.dataset.category = cat.name;
      section.innerHTML = '<div class="vtgCategoryHead"><div><span class="vtgCatKicker">VTG MARKETPLACE</span><h3>'+escapeHtml(cat.name)+'</h3></div><div class="vtgCategoryControls"><button type="button" class="vtgCatPrev" aria-label="Previous '+escapeHtml(cat.name)+'">‹</button><button type="button" class="vtgCatNext" aria-label="Next '+escapeHtml(cat.name)+'">›</button></div></div><div class="vtgCategoryTrack">'+
        related.map((idx,n) => {
          const p = imageFor(idx);
          const labels = n===0 ? 'Featured category' : ['Wholesale inventory','Supplier catalogue','International trade'][n-1];
          return '<button class="vtgCategoryCard" type="button" data-category-index="'+i+'"><img loading="lazy" decoding="async" src="'+p.img+'" alt="'+escapeHtml(p.name)+'"><span>'+escapeHtml(n===0 ? cat.name : labels)+'</span><small>'+escapeHtml(n===0 ? 'Browse category' : 'View trade inventory')+'</small></button>';
        }).join('')+
        '</div></section>';
      wrap.appendChild(section);
    });

    hero.parentElement.insertBefore(wrap, hero.nextElementSibling);

    wrap.querySelectorAll('.vtgCategoryCarousel').forEach(row => {
      const track = row.querySelector('.vtgCategoryTrack');
      row.querySelector('.vtgCatPrev').onclick = () => track.scrollBy({left:-Math.max(300,track.clientWidth*.72),behavior:'smooth'});
      row.querySelector('.vtgCatNext').onclick = () => track.scrollBy({left:Math.max(300,track.clientWidth*.72),behavior:'smooth'});
    });

    wrap.querySelectorAll('.vtgCategoryCard').forEach(card => {
      card.onclick = () => {
        const i = Number(card.dataset.categoryIndex);
        const slides = [...hero.querySelectorAll(':scope > img')];
        slides.forEach(x => x.classList.remove('active'));
        slides[i]?.classList.add('active');
        const badge = hero.querySelector('#productCatBadge');
        if (badge) badge.textContent = CATEGORIES[i].name;
        hero.scrollIntoView({behavior:'smooth',block:'center'});
      };
      card.querySelector('img').onerror = () => card.style.display = 'none';
    });
  }

  function addStyles() {
    if (document.getElementById('vtgVisualEnhancer')) return;
    const style = document.createElement('style');
    style.id = 'vtgVisualEnhancer';
    style.textContent = `
      #productHero{overflow:hidden;position:relative}
      #productHero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .65s ease}
      #productHero>img.active{opacity:.94}
      #productHero .copy,#productHero .catBadge{z-index:6}
      .vtg36Carousels{display:grid;gap:18px;margin-top:20px}
      .vtgCategoryCarousel{background:var(--white);border:1px solid var(--line);border-radius:20px;padding:16px;overflow:hidden;box-shadow:var(--shadow)}
      .vtgCategoryHead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}
      .vtgCatKicker{display:block;font-size:7px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);font-weight:800;margin-bottom:4px}
      .vtgCategoryHead h3{margin:0;color:var(--navy);font-size:18px;line-height:1.2}
      .vtgCategoryControls{display:flex;gap:7px}
      .vtgCategoryControls button{width:35px;height:35px;border:1px solid var(--line);border-radius:50%;background:var(--soft);color:var(--navy);font-size:24px;line-height:1;cursor:pointer}
      .vtgCategoryTrack{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px 2px 5px}
      .vtgCategoryTrack::-webkit-scrollbar{display:none}
      .vtgCategoryCard{flex:0 0 245px;border:1px solid var(--line);border-radius:15px;overflow:hidden;background:var(--white);padding:0;text-align:left;cursor:pointer;scroll-snap-align:start;box-shadow:0 8px 22px rgba(0,0,0,.06);transition:transform .2s ease,box-shadow .2s ease}
      .vtgCategoryCard:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(0,0,0,.12)}
      .vtgCategoryCard img{display:block;width:100%;height:145px;object-fit:cover;background:#20252b}
      .vtgCategoryCard span{display:block;padding:10px 11px 2px;color:var(--navy);font-size:11px;font-weight:800}
      .vtgCategoryCard small{display:block;padding:0 11px 11px;color:var(--muted);font-size:8px}
      html[data-theme="dark"] .vtgCategoryCarousel,html[data-theme="dark"] .vtgCategoryCard{background:#151b22;border-color:#2b3640;color:#eef3f6}
      html[data-theme="dark"] .vtgCategoryHead h3,html[data-theme="dark"] .vtgCategoryCard span{color:#f4f7f9}
      html[data-theme="dark"] .vtgCategoryControls button{background:#21171a;border-color:#4b2421;color:#ff8b82}
      html[data-theme="dark"] .vtgCategoryCard small{color:#aebbc5}
      @media(max-width:700px){.vtgCategoryCarousel{padding:13px}.vtgCategoryHead h3{font-size:15px}.vtgCategoryCard{flex-basis:205px}.vtgCategoryCard img{height:125px}}
    `;
    document.head.appendChild(style);
  }

  function loadRepairScript() {
    if (document.querySelector('script[data-vtg-ui-repair]')) return;
    const s=document.createElement('script');
    s.src='/vtg-ui-repair.js?v=5';
    s.dataset.vtgUiRepair='1';
    s.defer=true;
    document.head.appendChild(s);
  }

  function loadLiveMarket() {
    fetch('/api/market/dashboard',{cache:'no-store',headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{
      const news=Array.isArray(d.news)?d.news:[]; if(!news.length)return;
      const ticker=document.querySelector('.ticker span'); if(ticker)ticker.textContent=news.slice(0,10).map(x=>x.title).join(' • ');
      [...document.querySelectorAll('.newsItem')].slice(0,2).forEach((row,i)=>{const item=news[i];if(!item)return;const b=row.querySelector('b'),m=row.querySelector('small'),im=row.querySelector('img');if(b)b.textContent=item.title||'Current trade-market signal';if(m)m.textContent=(item.source||'VTG market feed')+' • '+new Date(item.published||Date.now()).toLocaleDateString();if(im&&item.image)im.src=item.image;});
    }).catch(()=>{});
  }

  function upgradeAI() {
    const form=document.querySelector('#aiForm'),input=document.querySelector('#aiInput'),msgs=document.querySelector('#aiMsgs');
    if(!form||!input||!msgs||form.dataset.vtgAiEnhanced)return;
    form.dataset.vtgAiEnhanced='1';
    const history=[];
    form.onsubmit=async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;const add=(role,t)=>{const d=document.createElement('div');d.className='msg '+role;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight};add('user',q);input.value='';history.push({role:'user',content:q});
      try{const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);const r=await fetch('/api/ai/public-chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:q,history:history.slice(-20),country:'Nigeria',role:localStorage.getItem('vtg_role')||'buyer',live:true,currentDate:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,page:location.href}),signal:c.signal});clearTimeout(timer);const d=await r.json();if(!r.ok)throw new Error(d.message||'AI request failed');const reply=d.reply||d.message||'I could not generate a response right now.';add('assistant',reply);history.push({role:'assistant',content:reply});}catch(err){add('assistant',err.name==='AbortError'?'The current-data request took too long. Please try again.':'I’m temporarily unable to connect to the VTG AI service. Please try again shortly.');}
    };
  }

  function apply(){
    try{addStyles();fixLogo();initProductCarousel();buildCategoryCarousels();loadRepairScript();upgradeAI();loadLiveMarket();setInterval(loadLiveMarket,300000);setTimeout(()=>{fixLogo();initProductCarousel();buildCategoryCarousels();},1200);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();