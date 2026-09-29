(() => {
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const VTG_CAROUSEL_ITEMS = [
    ["Cars & Automobiles",0],
    ["Motorcycles, Tricycles & Mobility",1],
    ["Bicycles & Personal Mobility",2],
    ["Pharmaceuticals & Medical Supplies",3],
    ["Agriculture & Farm Products",4],
    ["Clothing & Textiles",5],
    ["Footwear",6],
    ["Fashion & Accessories",7],
    ["Watches & Wearables",8],
    ["Electronics & Technology",9],
    ["Home & Furniture",10],
    ["Kitchen & Home Appliances",11],
    ["Beauty & Personal Care",12],
    ["Food & Beverages",13],
    ["Construction Equipment & Machinery",14],
    ["Tools & Hardware",15],
    ["Industrial Machinery & Equipment",16],
    ["Steel, Iron & Metal Products",17],
    ["Solar & Renewable Energy",18],
    ["Plumbing, Water & Sanitary",19],
    ["Packaging & Printing",20],
    ["Office & Business Supplies",21],
    ["Baby & Children’s Products",22],
    ["Cleaning & Household Supplies",23],
    ["Bags, Luggage & Travel",24],
    ["Retail & Commercial Equipment",25],
    ["Hotel, Restaurant & Catering Equipment",26],
    ["Factory & Production Supplies",27],
    ["Marine & Port Equipment",28],
    ["Logistics, Transport & Warehousing Equipment",29],
    ["Building Materials",30],
    ["Electrical & Power Equipment",31],
    ["Telecommunications & Networking",32],
    ["Industrial Materials & Coatings",33],
    ["General Merchandise",34],
    ["Import, Export & Trade Services",35]
  ];
  const VTG_CAROUSEL_SHEET = '/assets/vtg-carousel-sprite.webp';

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
      const slide=document.createElement('div');
      const hue=(index*47)%360;
      slide.className='vtgFreshSlide'+(index===0?' active':'');
      slide.style.setProperty('--vtg-hue',hue);
      slide.style.backgroundImage='url("'+VTG_CAROUSEL_SHEET+'")';
      const col=index%6, row=Math.floor(index/6); slide.style.backgroundPosition=(col*20)+'% '+(row*20)+'%';
      slide.setAttribute('role','img');
      slide.setAttribute('aria-label',item[0]);
      slides.appendChild(slide);
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
      wrap.querySelector('.vtgCarouselViewport').style.setProperty('--vtg-hue',(index*47)%360);
      title.textContent=VTG_CAROUSEL_ITEMS[index][0];
      count.textContent=(index+1)+' / '+VTG_CAROUSEL_ITEMS.length;
    };
    wrap.querySelector('.vtgCarouselPrev').onclick=()=>show(index-1);
    wrap.querySelector('.vtgCarouselNext').onclick=()=>show(index+1);
    title.textContent=VTG_CAROUSEL_ITEMS[0][0]; count.textContent='1 / '+VTG_CAROUSEL_ITEMS.length; wrap.querySelector('.vtgCarouselViewport').style.setProperty('--vtg-hue',0);
    clearInterval(window.__vtgFreshCarouselTimer);
    window.__vtgFreshCarouselTimer=setInterval(()=>show(index+1),3000);
    market.appendChild(wrap);
  }

  function addStyles() {
    if (document.getElementById('vtgVisualEnhancer')) return;
    const style = document.createElement('style');
    style.id = 'vtgVisualEnhancer';
    style.textContent = `
      .vtgFreshCarousel{margin-top:24px;position:relative;z-index:1;isolation:isolate;background:transparent}
      .vtgCarouselViewport{position:relative;height:390px;border-radius:22px;overflow:hidden;background:#111;box-shadow:0 18px 45px rgba(7,31,48,.16)}
      .vtgFreshSlide{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .65s ease,filter .65s ease;display:block;background-color:hsl(var(--vtg-hue,210),42%,28%);background-repeat:no-repeat;background-size:500% 500%}
      .vtgFreshSlide.active{opacity:1}
      .vtgCarouselViewport:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,hsla(var(--vtg-hue,210),78%,45%,.18),rgba(0,0,0,.04) 45%,rgba(0,0,0,.78) 100%);box-shadow:none;pointer-events:none}
      .vtgCarouselMeta{position:absolute;left:25px;right:25px;bottom:24px;z-index:3;display:grid;gap:5px;color:#fff}
      .vtgCarouselKicker{font-size:9px;font-weight:900;letter-spacing:.16em;color:hsl(var(--vtg-hue,210),85%,78%);text-transform:uppercase}
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
    try{addStyles();buildFreshVTGCarousel();upgradeAI();loadLiveMarket();setInterval(loadLiveMarket,300000);setTimeout(()=>{buildFreshVTGCarousel();},1200);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();