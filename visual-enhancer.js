(() => {
  const CATEGORIES = [
    ['Cars & Automobiles','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=90&w=1200&auto=format&fit=crop',['Sedans & SUVs','Electric Vehicles','Commercial Vehicles','Auto Parts & Accessories']],
    ['Motorcycles, Tricycles & Mobility','https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=90&w=1200&auto=format&fit=crop',['Motorcycles','Tricycles / Keke','Electric Motorcycles','Spare Parts']],
    ['Bicycles & Personal Mobility','https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=90&w=1200&auto=format&fit=crop',['Bicycles','Electric Bicycles','Scooters','Mobility Accessories']],
    ['Pharmaceuticals & Medical Supplies','https://www.vikshamedaccess.co.in/_next/image?q=75&url=%2FHome%2FMedicalCommodities%2FMedicines.webp&w=1200',['Medicines','Medical Equipment','Hospital Supplies','Laboratory Equipment','Medical Consumables']],
    ['Agriculture & Farm Products','https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=90&w=1200&auto=format&fit=crop',['Farm Produce','Seeds','Fertilizers','Farm Machinery','Agricultural Equipment']],
    ['Clothing & Textiles','https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=90&w=1200&auto=format&fit=crop',['Ready-made Clothing','Fabrics','Uniforms','Industrial Textiles','Traditional Fabrics']],
    ['Footwear','https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=90&w=1200&auto=format&fit=crop',['Sneakers','Men\'s Shoes','Women\'s Footwear','Children\'s Shoes','Safety & Work Boots','Sandals']],
    ['Fashion & Accessories','https://images.unsplash.com/photo-1558545541-c8e2470bbf71?q=90&w=1200&auto=format&fit=crop',['Bags','Belts & Wallets','Ties','Sunglasses','Fashion Accessories']],
    ['Watches & Wearables','https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=90&w=1200&auto=format&fit=crop',['Smartwatches','Luxury Watches','Fitness Trackers','Watch Accessories']],
    ['Electronics & Technology','https://images.unsplash.com/photo-1518770660439-4636190af475?q=90&w=1200&auto=format&fit=crop',['Smartphones','Tablets','Computers','Computer Accessories','Consumer Electronics']],
    ['Home & Furniture','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=90&w=1200&auto=format&fit=crop',['Sofas','Beds & Bedroom Furniture','Office Furniture','Home Décor','Lighting']],
    ['Kitchen & Home Appliances','https://images.unsplash.com/photo-1556911220-bff31c812dba?q=90&w=1200&auto=format&fit=crop',['Refrigerators & Freezers','Cookers','Blenders','Washing Machines','Small Appliances']],
    ['Beauty & Personal Care','https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=90&w=1200&auto=format&fit=crop',['Skincare','Hair Products','Cosmetics','Salon Equipment','Personal Care Equipment']],
    ['Food & Beverages','https://images.unsplash.com/photo-1542838132-92c53300491e?q=90&w=1200&auto=format&fit=crop',['Packaged Foods','Beverages','Grains','Spices','Food Ingredients']],
    ['Construction Equipment & Machinery','https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=90&w=1200&auto=format&fit=crop',['Excavators','Loaders','Cranes','Concrete Equipment','Road Construction Equipment']],
    ['Tools & Hardware','https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=90&w=1200&auto=format&fit=crop',['Hand Tools','Power Tools','Workshop Equipment','Fasteners','Industrial Hardware']],
    ['Industrial Machinery & Equipment','https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=90&w=1200&auto=format&fit=crop',['Manufacturing Machinery','Processing Equipment','Factory Equipment','Compressors','Pumps']],
    ['Steel, Iron & Metal Products','https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=90&w=1200&auto=format&fit=crop',['Steel Products','Aluminium','Pipes','Metal Sheets','Structural Materials']],
    ['Solar & Renewable Energy','https://cdn1-www.bureauveritas.co.uk/sites/g/files/zypfnx216/files/2022-04/Solar_Electric_Energy1024x768_0.png',['Solar Panels','Inverters','Batteries','Solar Generators','Solar Street Lights']],
    ['Plumbing, Water & Sanitary','https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=90&w=1200&auto=format&fit=crop',['Pipes & Fittings','Water Tanks','Water Pumps','Bathroom Fittings','Water Treatment']],
    ['Packaging & Printing','https://image.made-in-china.com/202f0j00RFcVfBehJGUp/6-Color-Automatic-Printing-Machine-for-Corrugated-Shipping-Boxes-with-Model-1428.webp',['Cartons & Boxes','Bottles & Containers','Labels','Printing Machines','Packaging Materials']],
    ['Office & Business Supplies','https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=90&w=1200&auto=format&fit=crop',['Office Equipment','Printers','Stationery','POS Equipment','Commercial Supplies']],
    ['Baby & Children\'s Products','https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=90&w=1200&auto=format&fit=crop',['Baby Clothing','Toys','Baby Furniture','Feeding Equipment','Children\'s Products']],
    ['Cleaning & Household Supplies','https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=90&w=1200&auto=format&fit=crop',['Cleaning Equipment','Detergents','Household Consumables','Commercial Cleaning','Cleaning Tools']],
    ['Bags, Luggage & Travel','https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=90&w=1200&auto=format&fit=crop',['Suitcases','Travel Bags','Backpacks','Business Bags','Leather Goods']],
    ['Retail & Commercial Equipment','https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=90&w=1200&auto=format&fit=crop',['Shop Fittings','Display Shelves','Refrigerated Displays','Supermarket Equipment','Vending Equipment']],
    ['Hotel, Restaurant & Catering Equipment','https://images.unsplash.com/photo-1552566626-52f8b828add9?q=90&w=1200&auto=format&fit=crop',['Commercial Kitchens','Restaurant Furniture','Catering Equipment','Bakery Equipment','Hotel Supplies']],
    ['Factory & Production Supplies','https://images.unsplash.com/photo-1565793298595-6a879b1d9492?q=90&w=1200&auto=format&fit=crop',['Raw Materials','Production Lines','Industrial Components','Factory Consumables','Production Equipment']],
    ['Marine & Port Equipment','https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=90&w=1200&auto=format&fit=crop',['Marine Equipment','Port Machinery','Shipping Containers','Cargo Handling','Shipping Supplies']],
    ['Logistics, Transport & Warehousing Equipment','https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=90&w=1200&auto=format&fit=crop',['Trucks','Trailers','Cargo Equipment','Material Handling','Warehouse Equipment']],
    ['Building Materials','https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=90&w=1200&auto=format&fit=crop',['Tiles','Doors & Windows','Roofing','Cement Products','Interior Finishing']],
    ['Electrical & Power Equipment','https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=90&w=1200&auto=format&fit=crop',['Cables','Switches','Transformers','Generators','Electrical Components']],
    ['Telecommunications & Networking','https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=90&w=1200&auto=format&fit=crop',['Routers','Network Equipment','Fibre Equipment','Communication Devices','Telecom Infrastructure']],
    ['Industrial Materials & Coatings','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=90&w=1200&auto=format&fit=crop',['Industrial Chemicals','Adhesives','Paints','Coatings','Manufacturing Materials']],
    ['General Merchandise','https://images.unsplash.com/photo-1601598851547-4302969d7e26?q=90&w=1200&auto=format&fit=crop',['Household Products','Consumer Goods','General Imported Goods','Wholesale Products','Everyday Supplies']],
    ['Import, Export & Trade Services','https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=90&w=1200&auto=format&fit=crop',['International Sourcing','Customs Clearance','Freight Forwarding','Trade Documentation','Door-to-Door Delivery']]
  ].map(([name,img,items]) => ({name,img,items}));

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
    wrap.innerHTML = '<div class="vtgCategoryIntro"><span>VTG MARKETPLACE</span><h2>Browse Trade Categories</h2><p>Choose a category to explore the products and supplier listings available under it.</p></div>';

    CATEGORIES.forEach((cat, i) => {
      const section = document.createElement('button');
      section.type = 'button';
      section.className = 'vtgCategoryTile';
      section.dataset.categoryIndex = String(i);
      section.innerHTML =
        '<span class="vtgCategoryThumb"><img loading="lazy" decoding="async" src="'+cat.img+'" alt="'+escapeHtml(cat.name)+'"><b aria-hidden="true">+</b></span>'+
        '<span class="vtgCategoryName">'+escapeHtml(cat.name)+'</span>'+
        '<span class="vtgCategoryCount">'+cat.items.length+' subcategories</span>';
      section.querySelector('img').onerror = () => { section.classList.add('image-failed'); };
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
      .vtg36Carousels{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-top:14px}
      .vtgCategoryIntro{grid-column:1/-1;padding:2px 1px 5px}
      .vtgCategoryIntro>span{font-size:6.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);font-weight:900}
      .vtgCategoryIntro h2{margin:2px 0 1px;color:var(--navy);font-size:20px}
      .vtgCategoryIntro p{margin:0;color:var(--muted);font-size:9px}
      .vtgCategoryTile{min-width:0;border:1px solid var(--line);border-radius:10px;background:var(--white);padding:5px;cursor:pointer;text-align:left;box-shadow:0 3px 11px rgba(0,0,0,.045);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      .vtgCategoryTile:hover{transform:translateY(-2px);border-color:var(--teal);box-shadow:0 7px 16px rgba(0,0,0,.09)}
      .vtgCategoryThumb{position:relative;display:block;height:54px;border-radius:7px;overflow:hidden;background:#eef1f3}
      .vtgCategoryThumb img{display:block;width:100%;height:100%;object-fit:cover}
      .vtgCategoryThumb b{position:absolute;right:3px;bottom:3px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.96);color:#9c241d;font-size:15px;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,.16)}
      .vtgCategoryName{display:block;margin-top:5px;color:var(--navy);font-size:8.5px;line-height:1.18;font-weight:850}
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
      html[data-theme="dark"] .vtgCategoryThumb{background:#202831}
      html[data-theme="dark"] .vtgSubcategory{background:#1d252d;border-color:#35414b}
      html[data-theme="dark"] .vtgCategoryIntro h2{color:#f4f7f9}
      html[data-theme="dark"] .vtgCategoryIntro p,html[data-theme="dark"] .vtgCategoryCount,html[data-theme="dark"] .vtgModalContent p{color:#aebbc5}
      @media(max-width:1100px){.vtg36Carousels{grid-template-columns:repeat(6,minmax(0,1fr))}} @media(max-width:800px){.vtg36Carousels{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.vtgCategoryThumb{height:52px}} @media(max-width:560px){.vtg36Carousels{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.vtgCategoryThumb{height:62px}.vtgCategoryName{font-size:9px}.vtgCategoryCount{font-size:7px}.vtgCategoryDialog{grid-template-columns:1fr}.vtgModalImage{height:150px;min-height:150px}.vtgModalImage img{min-height:150px}.vtgModalContent{padding:18px}.vtgCategoryItems{grid-template-columns:1fr}}
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