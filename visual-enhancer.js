(() => {
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

  const VTG_CAROUSEL_ITEMS = [
    ["Cars & Automobiles","https://canadianautodealer.ca/wp-content/uploads/2025/04/3_Used-vehicle-pricing-flat_1200.jpg"],
    ["Motorcycles, Tricycles & Mobility","https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=85&w=1600&auto=format&fit=crop"],
    ["Bicycles & Personal Mobility","https://image.made-in-china.com/2f0j00IpPklAvBEQcs/250W-Brushless-High-Speed-Electric-Bike-7-8ah-Lithium-Battery-Adult-Recreational-Bicycle.jpg"],
    ["Pharmaceuticals & Medical Supplies","https://www.57357.org/_next/image?q=100&url=https%3A%2F%2Fapi.57357.org%2Fstorage%2F3472%2FWhatsApp_Image_2026_02_10_at_151346.jpeg&w=1080"],
    ["Agriculture & Farm Products","https://topnews.kg/uploads/posts/2025-11/1763611202-11763610640-1140060.webp"],
    ["Clothing & Textiles","https://www.rmit.edu.au/content/dam/rmit/au/en/study-with-us/interest-areas/mastheads/fashion-study-area-1920x600.jpg"],
    ["Footwear","https://www.mcarthurglen.com/globalassets/global--page-specific/global-campaign-southern-europe/2023/00-sale/assets/winter-sale_secondary-image_example-1.jpg?preset=contain-xl"],
    ["Fashion & Accessories","https://www.cendriyon.com/wp-content/uploads/2024/08/Accessoires_de_Mode_Tendance_pour_Femmes__Les_Must_Have_de_la_Saison-1024x578.webp"],
    ["Watches & Wearables","https://cdn.mos.cms.futurecdn.net/z7vsVze8PmDsTxRzYPmy5.jpg"],
    ["Electronics & Technology","https://metreon.org/img/3333.jpg"],
    ["Home & Furniture","https://media.homeboxstores.com/i/homebox/163576011-163576011-HMBX07052021_01-2100.jpg?%24prodimg-m-sqr-pdp-2x%24=&%24quality-standard%24=&fmt=auto&sm=c"],
    ["Kitchen & Home Appliances","https://www.housedigest.com/img/gallery/the-best-kitchen-appliance-brands-based-on-reviews/l-intro-1737061366.jpg"],
    ["Beauty & Personal Care","https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=85&w=1600&auto=format&fit=crop"],
    ["Food & Beverages","https://asset.kompas.com/crops/zzRIxeH54dueBGGsaJlk8MQYoWA%3D/100x67%3A900x600/1200x800/data/photo/2020/10/21/5f90151bf2e36.jpg"],
    ["Construction Equipment & Machinery","https://operatorpro.co.uk/images/courses/360-excavator.jpg"],
    ["Tools & Hardware","https://tradecounterdirect.com/cdn/shop/collections/power-tools-2386841.png?v=1767888527"],
    ["Industrial Machinery & Equipment","https://www.nks-dit.de/lw_resource/datapool/systemfiles/cbox/6184/live/lw_cropper_teaserbild/lw_cropper_teaserbild.jpg"],
    ["Steel, Iron & Metal Products","https://atlantsnabcity.kz/image/catalog/catalog/metalloprokat.jpg"],
    ["Solar & Renewable Energy","https://m.economictimes.com/thumb/msid-98359811%2Cwidth-1200%2Cheight-1200%2Cresizemode-4%2Cimgsize-234962/solar-.jpg"],
    ["Plumbing, Water & Sanitary","https://s.alicdn.com/%40sc04/kf/Ha2de85c92cf14ba4bd45f7153fd363e2C/ASTM-CPVC-Plastic-Tube-Fitting-3-Way-1-2-Inch-Pn16-110-mm-90-Degree-Elbow-PVC-Pipe-Fitting.jpg"],
    ["Packaging & Printing","https://www.aalabels.com/theme/site/webimages/blog_images/custom-packaging-and-changing-market-trends-how-its-reshaping-the-business-landscape-01.webp?v=3681"],
    ["Office & Business Supplies","https://eu.evocdn.io/dealer/1898/content/media/Content_Pages/large-office-supplies-stationery-1.jpg"],
    ["Baby & Children’s Products","https://img.drz.lazcdn.com/static/pk/p/f011d8fad5a91cd21982961aaf7e3d65.jpg_960x960q80.jpg_.webp"],
    ["Cleaning & Household Supplies","https://thegoodshoppingguide.com/app/uploads/2022/05/Fast-Fashion-and-Ethical-Clothing-The-Good-Shopping-Guide-79.jpg"],
    ["Bags, Luggage & Travel","https://www.alriyadh.com/media/article/2024/06/23/img/3189514468.jpg"],
    ["Retail & Commercial Equipment","https://image.made-in-china.com/202f0j00NZtqcKEsgTrG/Customized-Color-Supermarket-Gondola-Shelving-Grocery-Shelves-for-Convenience-Store.webp"],
    ["Hotel, Restaurant & Catering Equipment","https://image.made-in-china.com/2f0j00UzMvECyAMncq/Star-Hotel-Commercial-Kitchen-Equipment-One-Stop-Catering-Solutions-for-Restaurants-and-Hotels.jpg"],
    ["Factory & Production Supplies","https://www.tmspl.org/images/ser1.jpg"],
    ["Marine & Port Equipment","https://gulftime.ae/wp-content/uploads/2023/01/AD-copy.jpg"],
    ["Logistics, Transport & Warehousing Equipment","https://cdn.bridge-imp.com/assets/images/c/202601_Distributionslogistik_LKW-219c1766.png"],
    ["Building Materials","https://www.nexgenexim.in/_next/image?q=75&url=%2Fimages%2Fproducts%2Froofing-tiles.webp&w=3840"],
    ["Electrical & Power Equipment","https://specap.com/_next/image?dpl=dpl_GR1mkvn39potgZieQaYjJ6YZHFpS&q=75&url=%2Fimages%2Fblog%2Fpower-electronics.webp&w=3840"],
    ["Telecommunications & Networking","https://img.directindustry.de/images_di/photo-g/61504-15857359.webp"],
    ["Industrial Materials & Coatings","https://images.yybcdn.com/sites/98500/98930/1778626839912960894098395136.jpg"],
    ["General Merchandise","https://glovo.dhmedia.io/image/stores-glovo/stores/77c4731e66daadbb77eb77f6cd2bd98992b3d7f04adc2102a3621d4eec5aa244?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MTI4MCwiaGVpZ2h0IjoxMjB9fSx7IndlYnAiOnsicSI6ImxvdyJ9fV0%3D"],
    ["Import, Export & Trade Services","https://image.made-in-china.com/2f0j00PnjqEZkhEugK/Sea-Freight-Forwarder-Logistics-Service-Ocean-Shipping-Agent-to-Walvis-Bay-Namibia.webp"]
  ];

  function vtgCarouselFallback(name, index) {
    const hue = (index * 31) % 360;
    const safe = String(name).replace(/[&<>]/g,'');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl('+hue+',45%,24%)"/><stop offset="1" stop-color="hsl('+((hue+35)%360)+',60%,40%)"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="970" cy="150" r="180" fill="rgba(255,255,255,.1)"/><circle cx="1040" cy="590" r="300" fill="rgba(0,0,0,.12)"/><text x="70" y="500" fill="#fff" font-family="Arial,sans-serif" font-size="48" font-weight="700">'+safe+'</text><text x="72" y="555" fill="rgba(255,255,255,.75)" font-family="Arial,sans-serif" font-size="22" letter-spacing="4">VTG MARKETPLACE</text></svg>';
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
  }

  function buildFreshVTGCarousel() {
    const market = document.querySelector('#market .section');
    if (!market || document.querySelector('#vtgProductCarousel')) return;
    const wrap = document.createElement('div');
    wrap.id = 'vtgProductCarousel';
    wrap.className = 'vtgFreshCarousel';
    wrap.innerHTML = '<div class="vtgCarouselViewport"><div class="vtgCarouselSlides"></div><button type="button" class="vtgCarouselPrev" aria-label="Previous product">‹</button><button type="button" class="vtgCarouselNext" aria-label="Next product">›</button><div class="vtgCarouselMeta"><span class="vtgCarouselKicker">VTG MARKETPLACE</span><strong class="vtgCarouselTitle"></strong><span class="vtgCarouselCount"></span></div></div><div class="vtgCarouselDots" aria-label="Carousel slides"></div>';
    const slides = wrap.querySelector('.vtgCarouselSlides');
    const dots = wrap.querySelector('.vtgCarouselDots');
    const title = wrap.querySelector('.vtgCarouselTitle');
    const count = wrap.querySelector('.vtgCarouselCount');
    VTG_CAROUSEL_ITEMS.forEach((item,index)=>{
      const img=document.createElement('img');
      img.className='vtgFreshSlide'+(index===0?' active':'');
      img.alt=item[0];
      img.loading=index<3?'eager':'lazy';
      img.decoding='async';
      img.src=item[1];
      img.onerror=()=>{ if(img.dataset.fallback) return; img.dataset.fallback='1'; img.src=vtgCarouselFallback(item[0],index); };
      slides.appendChild(img);
      const dot=document.createElement('button');
      dot.type='button'; dot.className='vtgCarouselDot'+(index===0?' active':''); dot.setAttribute('aria-label','Show '+item[0]); dots.appendChild(dot);
      dot.onclick=()=>show(index);
    });
    let index=0;
    const show=(next)=>{
      slides.children[index]?.classList.remove('active');
      dots.children[index]?.classList.remove('active');
      index=(next+VTG_CAROUSEL_ITEMS.length)%VTG_CAROUSEL_ITEMS.length;
      slides.children[index]?.classList.add('active');
      dots.children[index]?.classList.add('active');
      title.textContent=VTG_CAROUSEL_ITEMS[index][0];
      count.textContent=(index+1)+' / '+VTG_CAROUSEL_ITEMS.length;
    };
    wrap.querySelector('.vtgCarouselPrev').onclick=()=>show(index-1);
    wrap.querySelector('.vtgCarouselNext').onclick=()=>show(index+1);
    title.textContent=VTG_CAROUSEL_ITEMS[0][0]; count.textContent='1 / '+VTG_CAROUSEL_ITEMS.length;
    clearInterval(window.__vtgFreshCarouselTimer);
    window.__vtgFreshCarouselTimer=setInterval(()=>show(index+1),3000);
    market.appendChild(wrap);
  }

  function addStyles() {
    if (document.getElementById('vtgVisualEnhancer')) return;
    const style = document.createElement('style');
    style.id = 'vtgVisualEnhancer';
    style.textContent = `
      .vtgFreshCarousel{margin-top:24px}
      .vtgCarouselViewport{position:relative;height:390px;border-radius:22px;overflow:hidden;background:#111;box-shadow:0 18px 45px rgba(7,31,48,.16)}
      .vtgFreshSlide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .65s ease;display:block}
      .vtgFreshSlide.active{opacity:1}
      .vtgCarouselViewport:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 20%,rgba(0,0,0,.78) 100%);pointer-events:none}
      .vtgCarouselMeta{position:absolute;left:25px;right:25px;bottom:24px;z-index:3;display:grid;gap:5px;color:#fff}
      .vtgCarouselKicker{font-size:9px;font-weight:900;letter-spacing:.16em;color:#ffb0aa;text-transform:uppercase}
      .vtgCarouselTitle{font-size:clamp(22px,3vw,34px);line-height:1.1}
      .vtgCarouselCount{font-size:9px;color:rgba(255,255,255,.78)}
      .vtgCarouselPrev,.vtgCarouselNext{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:42px;height:42px;border:1px solid rgba(255,255,255,.4);border-radius:50%;background:rgba(10,15,20,.45);backdrop-filter:blur(7px);color:#fff;font-size:30px;line-height:1;cursor:pointer}
      .vtgCarouselPrev{left:14px}.vtgCarouselNext{right:14px}
      .vtgCarouselDots{display:flex;justify-content:center;gap:5px;margin-top:10px;flex-wrap:wrap}
      .vtgCarouselDot{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:#c7ced3;cursor:pointer}
      .vtgCarouselDot.active{background:#9c241d;transform:scale(1.35)}
      html[data-theme="dark"] .vtgCarouselDot{background:#4b5963}
      html[data-theme="dark"] .vtgCarouselViewport{box-shadow:0 18px 45px rgba(0,0,0,.35)}
      @media(max-width:600px){.vtgCarouselViewport{height:300px;border-radius:17px}.vtgCarouselMeta{left:17px;right:17px;bottom:17px}.vtgCarouselPrev,.vtgCarouselNext{width:36px;height:36px;font-size:25px}.vtgCarouselDots{gap:4px}.vtgCarouselDot{width:6px;height:6px}}
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
    try{addStyles();fixLogo();buildFreshVTGCarousel();loadRepairScript();upgradeAI();loadLiveMarket();setInterval(loadLiveMarket,300000);setTimeout(()=>{fixLogo();buildFreshVTGCarousel();},1200);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();