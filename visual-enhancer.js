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
    ["Cars & Automobiles","https://carsweek.ru/upload/iblock/8ba/hc44juzxiy7bvancclyn79reksq3x8hg.jpg"],
    ["Motorcycles, Tricycles & Mobility","https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=85&w=1600&auto=format&fit=crop"],
    ["Bicycles & Personal Mobility","https://img.kr.gcp-karroter.net/capri/bizPlatform/profile/41260994/1740204128120/SU1HXzU2MzkuanBlZw%3D%3D.jpeg?q=95&s=1440x1440&t=inside"],
    ["Pharmaceuticals & Medical Supplies","https://healthcaretalentlink.com/blog/wp-content/uploads/2023/03/how-medical-device-distributors-improve-patient-care.jpg"],
    ["Agriculture & Farm Products","https://jdcc.bank.in/mr/assets/images/resources/tractor.jpg"],
    ["Clothing & Textiles","https://assets.zyrosite.com/cdn-cgi/image/format%3Dauto%2Cw%3D768%2Ch%3D584%2Cfit%3Dcrop/YBgex4lw48TgqZay/whatsapp-image-2024-12-27-at-7.31.40-pm-Yleq0y4NlKH0jaWg.jpeg"],
    ["Footwear","https://cbu01.alicdn.com/img/ibank/O1CN01gf2Phq2HQvGBVG5t5_%21%212215889619146-0-cib.jpg"],
    ["Fashion & Accessories","https://www.cendriyon.com/wp-content/uploads/2024/08/Accessoires_de_Mode_Tendance_pour_Femmes__Les_Must_Have_de_la_Saison-1024x578.webp"],
    ["Watches & Wearables","https://i.ebayimg.com/images/g/x6gAAOSwqp1mrrsQ/s-l1200.png"],
    ["Electronics & Technology","https://astv.ru/content/NewsImage/4f/e2/4fe20ead-cb3e-41be-92d7-ad68d1ef97a0_3.jpg"],
    ["Home & Furniture","https://img5.jc001.cn/img/417/1846417/5ed76625870dc.jpg"],
    ["Kitchen & Home Appliances","https://media.binglee.com.au/cdn-cgi/image/fit%3Dscale-down%2Cf%3Dauto%2Cw%3D600/stores/4b326d6b/bing-lee-marsden-park-6.jpg"],
    ["Beauty & Personal Care","https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=85&w=1600&auto=format&fit=crop"],
    ["Food & Beverages","https://m.economictimes.com/thumb/msid-124199589%2Cwidth-1200%2Cheight-900%2Cresizemode-4%2Cimgsize-22250/consumer-companies-reaping-rich-rural-harvest.jpg"],
    ["Construction Equipment & Machinery","https://operatorpro.co.uk/images/courses/360-excavator.jpg"],
    ["Tools & Hardware","https://tradecounterdirect.com/cdn/shop/collections/power-tools-2386841.png?v=1767888527"],
    ["Industrial Machinery & Equipment","https://gbres.dfcfw.com/Files/iimage/20250104/BB2DB91D06947BB58683EC4A915EBE2B_w1080h720.jpg"],
    ["Steel, Iron & Metal Products","https://res.cloudinary.com/jerrick/image/upload/c_scale%2Cf_jpg%2Cq_auto/64995d726d8ad0001daa122d.jpg"],
    ["Solar & Renewable Energy","https://imperium.ng/_next/image?q=75&url=https%3A%2F%2Fstarloan.blob.core.windows.net%2Fimperiumdata%2Fproducts%2Fprimary_imgs%2Fbc97b4ab-5af7-48c0-b551-a1f6295391ac.png&w=1200"],
    ["Plumbing, Water & Sanitary","https://princesystemschennai.com/images/about-us.jpg"],
    ["Packaging & Printing","https://cdn.prod.website-files.com/6799fb467b101943e2504245/6799fb467b101943e2504964_672e0cf14e2e9682142cba4d_5ece9dfe3b049e6ab6e3490e_Schermata%2525202020-05-27%252520alle%25252019.04.50.webp"],
    ["Office & Business Supplies","https://stock.g2sservice.com/api/images/sousCategorie/main/29"],
    ["Baby & Children’s Products","https://cdncloudcart.com/10383/files/image/bebeshki-magazin-sofia2-67bd888870798.jpg"],
    ["Cleaning & Household Supplies","https://ilerigazetesicomtr.teimg.com/ilerigazetesi-com-tr/uploads/2023/11/2023/11-kasim/04-kasim/yerli-temizlik-urunleri-4.jpg"],
    ["Bags, Luggage & Travel","https://www.alriyadh.com/media/article/2024/06/23/img/3189514468.jpg"],
    ["Retail & Commercial Equipment","https://resource.yep.com.tw/static.dshop/1a82d170-7d46-11ee-b41e-85656d68e7fa/c7556981-bf86-4310-8745-28f7a2db07c0.jpg"],
    ["Hotel, Restaurant & Catering Equipment","https://image.made-in-china.com/2f0j00UzMvECyAMncq/Star-Hotel-Commercial-Kitchen-Equipment-One-Stop-Catering-Solutions-for-Restaurants-and-Hotels.jpg"],
    ["Factory & Production Supplies","https://gbres.dfcfw.com/Files/iimage/20250104/BB2DB91D06947BB58683EC4A915EBE2B_w1080h720.jpg"],
    ["Marine & Port Equipment","https://kalkaalow.co.tz/images/our-work/services_pic02.jpg"],
    ["Logistics, Transport & Warehousing Equipment","https://cdn.prod.website-files.com/6053079d4ad5d785961d4e93/6694d55266d3587eda89bbf0_kabotage.webp"],
    ["Building Materials","https://274418.selcdn.ru/cv08300-33250f0d-0664-43fc-9dbf-9d89738d114e/uploads/519844/9bd27ab0-9ca6-447a-a07f-bf87ef1ff795.jpg"],
    ["Electrical & Power Equipment","https://inwfile.com/s-gj/fwscc4.jpg"],
    ["Telecommunications & Networking","https://www.gettyimages.com/"],
    ["Industrial Materials & Coatings","https://static0.innoget.com/uploads/b447b42fff050af2968cd1317a5422533a42b942.png"],
    ["General Merchandise","https://m.economictimes.com/thumb/msid-124199589%2Cwidth-1200%2Cheight-900%2Cresizemode-4%2Cimgsize-22250/consumer-companies-reaping-rich-rural-harvest.jpg"],
    ["Import, Export & Trade Services","https://kalkaalow.co.tz/images/our-work/services_pic02.jpg"]
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