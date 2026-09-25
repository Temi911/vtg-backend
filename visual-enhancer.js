(() => {
  const CATEGORIES = [
    ['Cars & Automobiles','https://loremflickr.com/1200/700/car?lock=101',['Sedans & SUVs','Electric Vehicles','Commercial Vehicles','Auto Parts & Accessories']],
    ['Motorcycles, Tricycles & Mobility','https://loremflickr.com/1200/700/motorcycle?lock=102',['Motorcycles','Tricycles / Keke','Electric Motorcycles','Spare Parts']],
    ['Bicycles & Personal Mobility','https://loremflickr.com/1200/700/bicycle?lock=103',['Bicycles','Electric Bicycles','Scooters','Mobility Accessories']],
    ['Pharmaceuticals & Medical Supplies','https://loremflickr.com/1200/700/medicine?lock=104',['Medicines','Medical Equipment','Hospital Supplies','Laboratory Equipment','Medical Consumables']],
    ['Agriculture & Farm Products','https://loremflickr.com/1200/700/farm?lock=105',['Farm Produce','Seeds','Fertilizers','Farm Machinery','Agricultural Equipment']],
    ['Clothing & Textiles','https://loremflickr.com/1200/700/clothing?lock=106',['Ready-made Clothing','Fabrics','Uniforms','Industrial Textiles','Traditional Fabrics']],
    ['Footwear','https://loremflickr.com/1200/700/shoes?lock=107',['Sneakers','Men\'s Shoes','Women\'s Footwear','Children\'s Shoes','Safety & Work Boots','Sandals']],
    ['Fashion & Accessories','https://loremflickr.com/1200/700/fashion?lock=108',['Bags','Belts & Wallets','Ties','Sunglasses','Fashion Accessories']],
    ['Watches & Wearables','https://loremflickr.com/1200/700/watch?lock=109',['Smartwatches','Luxury Watches','Fitness Trackers','Watch Accessories']],
    ['Electronics & Technology','https://loremflickr.com/1200/700/electronics?lock=110',['Smartphones','Tablets','Computers','Computer Accessories','Consumer Electronics']],
    ['Home & Furniture','https://loremflickr.com/1200/700/furniture?lock=111',['Sofas','Beds & Bedroom Furniture','Office Furniture','Home Décor','Lighting']],
    ['Kitchen & Home Appliances','https://loremflickr.com/1200/700/kitchen?lock=112',['Refrigerators & Freezers','Cookers','Blenders','Washing Machines','Small Appliances']],
    ['Beauty & Personal Care','https://loremflickr.com/1200/700/cosmetics?lock=113',['Skincare','Hair Products','Cosmetics','Salon Equipment','Personal Care Equipment']],
    ['Food & Beverages','https://loremflickr.com/1200/700/food?lock=114',['Packaged Foods','Beverages','Grains','Spices','Food Ingredients']],
    ['Construction Equipment & Machinery','https://loremflickr.com/1200/700/excavator?lock=115',['Excavators','Loaders','Cranes','Concrete Equipment','Road Construction Equipment']],
    ['Tools & Hardware','https://loremflickr.com/1200/700/tools?lock=116',['Hand Tools','Power Tools','Workshop Equipment','Fasteners','Industrial Hardware']],
    ['Industrial Machinery & Equipment','https://loremflickr.com/1200/700/machinery?lock=117',['Manufacturing Machinery','Processing Equipment','Factory Equipment','Compressors','Pumps']],
    ['Steel, Iron & Metal Products','https://loremflickr.com/1200/700/steel?lock=118',['Steel Products','Aluminium','Pipes','Metal Sheets','Structural Materials']],
    ['Solar & Renewable Energy','https://loremflickr.com/1200/700/solar?lock=119',['Solar Panels','Inverters','Batteries','Solar Generators','Solar Street Lights']],
    ['Plumbing, Water & Sanitary','https://loremflickr.com/1200/700/plumbing?lock=120',['Pipes & Fittings','Water Tanks','Water Pumps','Bathroom Fittings','Water Treatment']],
    ['Packaging & Printing','https://loremflickr.com/1200/700/packaging?lock=121',['Cartons & Boxes','Bottles & Containers','Labels','Printing Machines','Packaging Materials']],
    ['Office & Business Supplies','https://loremflickr.com/1200/700/office?lock=122',['Office Equipment','Printers','Stationery','POS Equipment','Commercial Supplies']],
    ['Baby & Children\'s Products','https://loremflickr.com/1200/700/baby?lock=123',['Baby Clothing','Toys','Baby Furniture','Feeding Equipment','Children\'s Products']],
    ['Cleaning & Household Supplies','https://loremflickr.com/1200/700/cleaning?lock=124',['Cleaning Equipment','Detergents','Household Consumables','Commercial Cleaning','Cleaning Tools']],
    ['Bags, Luggage & Travel','https://loremflickr.com/1200/700/luggage?lock=125',['Suitcases','Travel Bags','Backpacks','Business Bags','Leather Goods']],
    ['Retail & Commercial Equipment','https://loremflickr.com/1200/700/retail?lock=126',['Shop Fittings','Display Shelves','Refrigerated Displays','Supermarket Equipment','Vending Equipment']],
    ['Hotel, Restaurant & Catering Equipment','https://loremflickr.com/1200/700/restaurant?lock=127',['Commercial Kitchens','Restaurant Furniture','Catering Equipment','Bakery Equipment','Hotel Supplies']],
    ['Factory & Production Supplies','https://loremflickr.com/1200/700/factory?lock=128',['Raw Materials','Production Lines','Industrial Components','Factory Consumables','Production Equipment']],
    ['Marine & Port Equipment','https://loremflickr.com/1200/700/ship?lock=129',['Marine Equipment','Port Machinery','Shipping Containers','Cargo Handling','Shipping Supplies']],
    ['Logistics, Transport & Warehousing Equipment','https://loremflickr.com/1200/700/truck?lock=130',['Trucks','Trailers','Cargo Equipment','Material Handling','Warehouse Equipment']],
    ['Building Materials','https://loremflickr.com/1200/700/building?lock=131',['Tiles','Doors & Windows','Roofing','Cement Products','Interior Finishing']],
    ['Electrical & Power Equipment','https://loremflickr.com/1200/700/electrical?lock=132',['Cables','Switches','Transformers','Generators','Electrical Components']],
    ['Telecommunications & Networking','https://loremflickr.com/1200/700/telecommunications?lock=133',['Routers','Network Equipment','Fibre Equipment','Communication Devices','Telecom Infrastructure']],
    ['Industrial Materials & Coatings','https://loremflickr.com/1200/700/paint?lock=134',['Industrial Chemicals','Adhesives','Paints','Coatings','Manufacturing Materials']],
    ['General Merchandise','https://loremflickr.com/1200/700/wholesale?lock=135',['Household Products','Consumer Goods','General Imported Goods','Wholesale Products','Everyday Supplies']],
    ['Import, Export & Trade Services','https://loremflickr.com/1200/700/shipping?lock=136',['International Sourcing','Customs Clearance','Freight Forwarding','Trade Documentation','Door-to-Door Delivery']]
  ].map(([name,img,items]) => ({name,img,items}));

  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function fixLogo() {
    const imgs = document.querySelectorAll('img.brandLogo, img[src*="vtg-logo-red-transparent.png"]');
    imgs.forEach(img => {
      // Keep the canonical asset URL untouched. Rewriting the src after first paint
      // can make the logo flash and then disappear on some cached deployments.
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      img.onerror = () => {
        if (img.dataset.vtgLogoRetried === '1') return;
        img.dataset.vtgLogoRetried = '1';
        img.src = '/assets/vtg-logo-red-transparent.png';
      };
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
      img.loading = 'eager';
      img.alt = p.name;
      img.src = p.img;
      img.className = i === 0 ? 'active' : '';
      img.dataset.fallback = '0';
      img.onerror = () => {
        if (img.dataset.fallback === '1') return;
        img.dataset.fallback = '1';
        img.src = 'https://picsum.photos/seed/vtg-' + (i + 101) + '/1200/700';
      };
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
    window.__vtgHeroTimer = setInterval(() => show((index + 1) % slides.length), 3000);
  }

  function buildCategoryCarousels() {
    const hero = document.querySelector('#productHero');
    if (!hero || document.querySelector('.vtg36Carousels')) return;

    const wrap = document.createElement('div');
    wrap.className = 'vtg36Carousels';
    wrap.innerHTML = '<div class="vtgCategoryIntro"><span>VTG MARKETPLACE</span><h2>Browse Trade Categories</h2></div>';

    CATEGORIES.slice(0, 9).forEach((cat, i) => {
      const section = document.createElement('button');
      section.type = 'button';
      section.className = 'vtgCategoryTile';
      section.dataset.categoryIndex = String(i);
      section.innerHTML =
        '<span class="vtgCategoryPlus" aria-hidden="true">+</span>'+
        '<span class="vtgCategoryName">'+escapeHtml(cat.name)+'</span>';
      wrap.appendChild(section);
    });

    hero.parentElement.insertBefore(wrap, hero.nextElementSibling);

    const modal = document.createElement('div');
    modal.className = 'vtgCategoryModal';
    modal.innerHTML =
      '<div class="vtgCategoryModalBackdrop"></div>'+
      '<div class="vtgCategoryDialog" role="dialog" aria-modal="true" aria-labelledby="vtgCategoryDialogTitle">'+
        '<button type="button" class="vtgCategoryClose" aria-label="Close category">×</button>'+
        '<div class="vtgModalImage"><img id="vtgModalImg" alt=""></div>'+
        '<div class="vtgModalContent"><span class="vtgCatKicker">VTG MARKETPLACE</span><h3 id="vtgCategoryDialogTitle"></h3><p>Explore this category through the product and supplier listings below.</p><div id="vtgCategoryItems" class="vtgCategoryItems"></div></div>'+
      '</div>';
    document.body.appendChild(modal);

    const close = () => { modal.classList.remove('open'); document.body.classList.remove('vtgModalOpen'); };
    modal.querySelector('.vtgCategoryClose').onclick = close;
    modal.querySelector('.vtgCategoryModalBackdrop').onclick = close;
    document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });

    wrap.querySelectorAll('.vtgCategoryTile').forEach(tile => {
      tile.onclick = () => {
        const cat = CATEGORIES[Number(tile.dataset.categoryIndex)];
        const mimg = modal.querySelector('#vtgModalImg');
        modal.querySelector('#vtgCategoryDialogTitle').textContent = cat.name;
        mimg.src = cat.img;
        mimg.alt = cat.name;
        modal.querySelector('#vtgCategoryItems').innerHTML = cat.items.map(item =>
          '<button type="button" class="vtgSubcategory">'+escapeHtml(item)+'<span>›</span></button>'
        ).join('');
        modal.classList.add('open');
        document.body.classList.add('vtgModalOpen');
        modal.querySelectorAll('.vtgSubcategory').forEach(btn => {
          btn.onclick = () => {
            const params = new URLSearchParams({category:cat.name, subcategory:btn.textContent.replace('›','').trim()});
            window.location.hash = 'market?'+params.toString();
            close();
            hero.scrollIntoView({behavior:'smooth',block:'center'});
          };
        });
      };
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
      .vtg36Carousels{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:7px;margin-top:14px}
      .vtgCategoryIntro{grid-column:1/-1;padding:1px 1px 3px}
      .vtgCategoryIntro>span{font-size:6.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);font-weight:900}
      .vtgCategoryIntro h2{margin:1px 0;color:var(--navy);font-size:18px}
      .vtgCategoryTile{min-width:0;display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:9px;background:var(--white);padding:9px 8px;cursor:pointer;text-align:left;box-shadow:0 3px 11px rgba(0,0,0,.045);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      .vtgCategoryTile:hover{transform:translateY(-2px);border-color:var(--teal);box-shadow:0 7px 16px rgba(0,0,0,.09)}
      .vtgCategoryPlus{flex:0 0 20px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#9c241d;color:#fff;font-size:15px;font-weight:900;line-height:1}
      .vtgCategoryName{display:block;margin:0;color:var(--navy);font-size:9px;line-height:1.18;font-weight:850}
      .vtgCategoryCount{display:block;margin-top:2px;color:var(--muted);font-size:7px;line-height:1.15}
      .vtgCategoryModal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
      .vtgCategoryModal.open{display:flex}
      .vtgCategoryModalBackdrop{position:absolute;inset:0;background:rgba(5,12,18,.72);backdrop-filter:blur(5px)}
      .vtgCategoryDialog{position:relative;width:min(720px,100%);max-height:min(760px,92vh);overflow:auto;background:var(--white);border:1px solid var(--line);border-radius:20px;box-shadow:0 25px 70px rgba(0,0,0,.35);display:grid;grid-template-columns:220px 1fr}
      .vtgCategoryClose{position:absolute;right:12px;top:10px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:24px;cursor:pointer;z-index:2}
      .vtgModalImage{min-height:240px;background:#1b2228}
      .vtgModalImage img{width:100%;height:100%;min-height:240px;object-fit:cover}
      .vtgModalContent{padding:24px}
      .vtgModalContent h3{margin:3px 0 6px;color:var(--navy);font-size:23px}
      .vtgModalContent p{margin:0 0 15px;color:var(--muted);font-size:11px}
      .vtgCategoryItems{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .vtgSubcategory{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:var(--soft);color:var(--navy);font-size:10px;font-weight:750;text-align:left;cursor:pointer}
      .vtgSubcategory:hover{border-color:var(--teal);background:var(--white)}
      .vtgSubcategory span{font-size:17px;color:var(--teal)}
      body.vtgModalOpen{overflow:hidden}
      html[data-theme="dark"] .vtgCategoryTile,html[data-theme="dark"] .vtgCategoryDialog{background:#151b22;border-color:#2b3640}
      html[data-theme="dark"] .vtgCategoryName,html[data-theme="dark"] .vtgModalContent h3,html[data-theme="dark"] .vtgSubcategory{color:#f4f7f9}
      html[data-theme="dark"] .vtgCategoryPlus{background:#b52d24}
      html[data-theme="dark"] .vtgSubcategory{background:#1d252d;border-color:#35414b}
      html[data-theme="dark"] .vtgCategoryIntro h2{color:#f4f7f9}
      html[data-theme="dark"] .vtgModalContent p{color:#aebbc5}
      @media(max-width:1100px){.vtg36Carousels{grid-template-columns:repeat(6,minmax(0,1fr))}} @media(max-width:800px){.vtg36Carousels{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}} @media(max-width:560px){.vtg36Carousels{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.vtgCategoryName{font-size:9px}.vtgCategoryCount{display:none}.vtgCategoryDialog{grid-template-columns:1fr}.vtgModalImage{height:150px;min-height:150px}.vtgModalImage img{min-height:150px}.vtgModalContent{padding:18px}.vtgCategoryItems{grid-template-columns:1fr}}
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