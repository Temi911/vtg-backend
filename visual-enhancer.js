(() => {
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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


  function replaceMarketplaceIntro() {
    const intro = document.querySelector('.market .sectionHead p');
    if (intro) intro.textContent = "Trade Documents & Compliance — Keep invoices, packing lists, shipping records and compliance steps organized around each transaction.";
  }

  function installTradeCarousel() {
    if (document.querySelector('#vtgProductCarousel')) return;
    const market = document.querySelector('.market .section');
    if (!market) return;

    const categories = [
      ["Cars & Automobiles","🚗"],["Motorcycles, Tricycles & Mobility","🏍"],["Bicycles & Personal Mobility","🚲"],
      ["Medical Supplies & Healthcare","⚕"],["Agriculture & Farm Products","🌾"],["Clothing & Textiles","👕"],
      ["Footwear","👟"],["Fashion & Accessories","👜"],["Watches & Wearables","⌚"],["Electronics & Technology","💻"],
      ["Home & Furniture","🛋"],["Kitchen & Home Appliances","🍳"],["Beauty & Personal Care","✨"],["Food & Beverages","🍎"],
      ["Construction Equipment & Machinery","🏗"],["Tools & Hardware","🔧"],["Industrial Machinery & Equipment","⚙"],
      ["Steel, Iron & Metal Products","▣"],["Solar & Renewable Energy","☀"],["Plumbing, Water & Sanitary","🚿"],
      ["Packaging & Printing","📦"],["Office & Business Supplies","📎"],["Baby & Children's Products","🧸"],
      ["Cleaning & Household Supplies","🧹"],["Bags, Luggage & Travel","🧳"],["Retail & Commercial Equipment","🏪"],
      ["Hotel, Restaurant & Catering Equipment","🍽"],["Factory & Production Supplies","🏭"],["Marine & Port Equipment","⚓"],
      ["Logistics, Transport & Warehousing Equipment","🚚"],["Building Materials","🧱"],["Electrical & Power Equipment","🔌"],
      ["Telecommunications & Networking","📡"],["Industrial Materials","🧰"],["General Merchandise","🛍"],
      ["Import, Export & Trade Services","🌐"]
    ];

    const categoryImages = {
      "Cars & Automobiles":"https://hips.hearstapps.com/hmg-prod/images/5ae0e9e1-a5de-4176-9a47-9bfb397e9d22.jpeg?crop=0.74945xw%3A1xh%3Bcenter%2Ctop&resize=1200%3A%2A",
      "Bicycles & Personal Mobility":"https://assets.newatlas.com/dims4/default/ea73d8b/2147483647/strip/true/crop/1620x1080%2B0%2B0/resize/1620x1080%21/format/webp/quality/85/?url=https%3A%2F%2Fnewatlas-brightspot.s3.amazonaws.com%2Farchive%2F506A7544.jpg",
      "Medical Supplies & Healthcare":"https://www.57357.org/_next/image?q=100&url=https%3A%2F%2Fapi.57357.org%2Fstorage%2F3472%2FWhatsApp_Image_2026_02_10_at_151346.jpeg&w=1080",
      "Agriculture & Farm Products":"https://cloudfront-eu-central-1.images.arcpublishing.com/williamreed/HWAY4IBGKBKI5FN34NRFXPALMQ.jpg",
      "Clothing & Textiles":"https://valox.com.ua/upload/rimg/chomu-vazhlivo-slidkuvati-za-modnimi-tendentsiyami.jpg",
      "Footwear":"https://www.bayxbengal.com/industries/footwear.webp",
      "Fashion & Accessories":"https://claudioandco.com/cdn/shop/articles/IMG_0282.jpg?v=1772215671&width=1500",
      "Watches & Wearables":"https://cdn.mos.cms.futurecdn.net/z7vsVze8PmDsTxRzYPmy5.jpg",
      "Electronics & Technology":"https://knjiznica-trzic.splet.arnes.si/files/2024/09/Phones-1.jpg",
      "Home & Furniture":"https://www.ifurniture.co.nz/images/thumbs/0064512_lancaster-fabric-sofa-range-grey-2-seater.jpeg",
      "Kitchen & Home Appliances":"https://i.postimg.cc/W4xx6fsb/IMG-0708.jpg",
      "Construction Equipment & Machinery":"https://ugabox.com/images/shop/machinery/Machinery-Equipment-online-shop-uganda.jpg",
      "Industrial Machinery & Equipment":"https://gbres.dfcfw.com/Files/iimage/20250104/BB2DB91D06947BB58683EC4A915EBE2B_w1080h720.jpg",
      "Food & Beverages":"https://supplier-offers-media-production.s3.eu-central-1.amazonaws.com/5bebefe9-0732-11f1-818e-0a58a9feac02.png",
      "Steel, Iron & Metal Products":"https://irp-cdn.multiscreensite.com/9fec2152/dms3rep/multi/Cartagena-bodega-chipa-Agofer-e1201e26.JPG",
      "Solar & Renewable Energy":"https://www.sunners.com.br/images/equipamentos-de-energia-solar-fotovoltaica-01.webp",
      "Plumbing, Water & Sanitary":"https://hilitebmt.com/static/2fcdba86c15cc1f4f70cb20e38f94f3d/3564b/sanitary-items.jpg",
      "Packaging & Printing":"https://images.ctfassets.net/cma41nsiygxr/65KW26r0jd0J8WPmf2jtrk/fdc314fdceb622ca4e39df42e848504c/box_cat-boxes-for-objects_3.jpg",
      "Office & Business Supplies":"https://eu.evocdn.io/dealer/1898/content/media/Content_Pages/large-office-supplies-stationery-1.jpg",
      "Retail & Commercial Equipment":"https://img.waimaoniu.net/2456/2456-202509291705011260.jpg",
      "Hotel, Restaurant & Catering Equipment":"https://www.costowl.com/assets/images/heroes/equipment-leasing-hero-restaurant.jpg",
      "Factory & Production Supplies":"https://gbres.dfcfw.com/Files/iimage/20250104/BB2DB91D06947BB58683EC4A915EBE2B_w1080h720.jpg",
      "Marine & Port Equipment":"https://multimedia.elpais.com.co/2023/07_julio/500_empresas/img_editorial/art1.jpg",
      "Logistics, Transport & Warehousing Equipment":"https://www.klikovacdoo.com/images/Hale-i-magacini/Galerija/Hale_i_magacini_003.jpg",
      "Building Materials":"https://www.erlgroup.com.tr/tugla.jpg",
      "Electrical & Power Equipment":"https://specap.com/_next/image?dpl=dpl_GR1mkvn39potgZieQaYjJ6YZHFpS&q=75&url=%2Fimages%2Fblog%2Fpower-electronics.webp&w=3840"
    };

    const hues = [8,266,151,216,28,326,196,284,214,173];
    const fallback = (emoji,title,index) => {
      const hue=hues[index%hues.length];
      return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl('+hue+',55%,28%)"/><stop offset="1" stop-color="hsl('+(hue+35)+',62%,42%)"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="980" cy="150" r="190" fill="#fff" opacity=".09"/><circle cx="1100" cy="650" r="300" fill="#000" opacity=".12"/><text x="70" y="500" fill="#fff" font-family="Arial,sans-serif" font-size="62" font-weight="700">'+String(title).replace(/[&<>]/g,'')+'</text><text x="72" y="555" fill="rgba(255,255,255,.75)" font-family="Arial,sans-serif" font-size="24" letter-spacing="4">VTG MARKETPLACE</text></svg>'
      );
    };

    const style=document.createElement('style');
    style.id='vtgTradeCarouselStyles';
    style.textContent=`
      #vtgProductCarousel{margin-top:24px;position:relative;z-index:1;isolation:isolate;background:transparent}
      #vtgProductCarousel .vtgCarouselViewport{position:relative;height:390px;border-radius:22px;overflow:hidden;background:#111;box-shadow:0 18px 45px rgba(7,31,48,.16)}
      #vtgProductCarousel .vtgCarouselSlides{position:absolute;inset:0}
      #vtgProductCarousel .vtgFreshSlide{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .65s ease,filter .65s ease;display:block;background:#111}
      #vtgProductCarousel .vtgFreshSlide.active{opacity:1}
      #vtgProductCarousel .vtgFreshSlide img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
      #vtgProductCarousel .vtgCarouselViewport:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,.03),rgba(0,0,0,.04) 42%,rgba(0,0,0,.78) 100%);pointer-events:none}
      #vtgProductCarousel .vtgCarouselMeta{position:absolute;left:25px;right:25px;bottom:24px;z-index:3;display:grid;gap:5px;color:#fff}
      #vtgProductCarousel .vtgCarouselKicker{font-size:9px;font-weight:900;letter-spacing:.16em;color:rgba(255,255,255,.78);text-transform:uppercase}
      #vtgProductCarousel .vtgCarouselTitle{font-size:clamp(22px,3vw,34px);line-height:1.1}
      #vtgProductCarousel .vtgCarouselCount{font-size:9px;color:rgba(255,255,255,.78)}
      #vtgProductCarousel .vtgCarouselPrev,#vtgProductCarousel .vtgCarouselNext{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:42px;height:42px;border:1px solid rgba(255,255,255,.4);border-radius:50%;background:rgba(10,15,20,.45);backdrop-filter:blur(7px);color:#fff;font-size:30px;line-height:1;cursor:pointer}
      #vtgProductCarousel .vtgCarouselPrev{left:14px}#vtgProductCarousel .vtgCarouselNext{right:14px}
      #vtgProductCarousel .vtgCarouselDots{display:flex;justify-content:center;gap:5px;margin-top:10px;flex-wrap:wrap}
      #vtgProductCarousel .vtgCarouselDot{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:#c7ced3;cursor:pointer}
      #vtgProductCarousel .vtgCarouselDot.active{background:#9c241d;transform:scale(1.35)}
      html[data-theme="dark"] #vtgProductCarousel .vtgCarouselDot{background:#4b5963}
      html[data-theme="dark"] #vtgProductCarousel .vtgCarouselViewport{box-shadow:0 18px 45px rgba(0,0,0,.35)}
      @media(max-width:600px){#vtgProductCarousel .vtgCarouselViewport{height:300px;border-radius:17px}#vtgProductCarousel .vtgCarouselMeta{left:17px;right:17px;bottom:17px}#vtgProductCarousel .vtgCarouselPrev,#vtgProductCarousel .vtgCarouselNext{width:36px;height:36px;font-size:25px}#vtgProductCarousel .vtgCarouselDots{gap:4px}#vtgProductCarousel .vtgCarouselDot{width:6px;height:6px}}
    `;
    document.head.appendChild(style);

    const wrap=document.createElement('section');
    wrap.id='vtgProductCarousel';
    wrap.innerHTML='<div class="vtgCarouselViewport"><div class="vtgCarouselSlides"></div><button type="button" class="vtgCarouselPrev" aria-label="Previous category">‹</button><button type="button" class="vtgCarouselNext" aria-label="Next category">›</button><div class="vtgCarouselMeta"><span class="vtgCarouselKicker">VTG MARKETPLACE</span><strong class="vtgCarouselTitle"></strong><span class="vtgCarouselCount"></span></div></div><div class="vtgCarouselDots" aria-label="Carousel categories"></div>';
    const slides=wrap.querySelector('.vtgCarouselSlides');
    const dots=wrap.querySelector('.vtgCarouselDots');
    const title=wrap.querySelector('.vtgCarouselTitle');
    const count=wrap.querySelector('.vtgCarouselCount');

    categories.forEach(([name,emoji],index)=>{
      const slide=document.createElement('div');
      slide.className='vtgFreshSlide'+(index===0?' active':'');
      const img=document.createElement('img');
      img.loading='eager';
      img.alt=name;
      img.src=categoryImages[name]||fallback(emoji,name,index);
      img.addEventListener('error',()=>{img.src=fallback(emoji,name,index);},{once:true});
      slide.setAttribute('role','group');
      slide.setAttribute('aria-label',name);
      slide.appendChild(img);
      slides.appendChild(slide);

      const dot=document.createElement('button');
      dot.type='button';dot.className='vtgCarouselDot'+(index===0?' active':'');dot.setAttribute('aria-label','Show '+name);
      dots.appendChild(dot);
    });

    let index=0,timer=null;
    const show=nextIndex=>{
      slides.children[index]?.classList.remove('active');
      dots.children[index]?.classList.remove('active');
      index=(nextIndex+categories.length)%categories.length;
      slides.children[index]?.classList.add('active');
      dots.children[index]?.classList.add('active');
      title.textContent=categories[index][0];
      count.textContent=(index+1)+' / '+categories.length;
    };
    dots.querySelectorAll('button').forEach((dot,i)=>dot.addEventListener('click',()=>{show(i);restart();}));
    wrap.querySelector('.vtgCarouselPrev').onclick=()=>{show(index-1);restart();};
    wrap.querySelector('.vtgCarouselNext').onclick=()=>{show(index+1);restart();};
    const restart=()=>{clearInterval(timer);timer=setInterval(()=>show(index+1),3000);};
    title.textContent=categories[0][0];
    count.textContent='1 / '+categories.length;
    market.appendChild(wrap);
    restart();
  }
  function apply(){
    try{upgradeAI();loadLiveMarket();replaceMarketplaceIntro();installTradeCarousel();setInterval(loadLiveMarket,300000);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();