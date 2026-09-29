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
    if (intro) intro.textContent = "VTG connects product discovery, company verification, logistics, trade finance and market intelligence in one connected workflow.";
  }

  function installTradeCarousel() {
    if (document.querySelector('#vtgTradeCarousel')) return;
    const market = document.querySelector('.market .section');
    if (!market) return;

    const categories = [
      ["Cars & Automobiles","1496181133206-80ce9b88a853","🚗"],
      ["Motorcycles, Tricycles & Mobility","1511707171634-5f897ff02aa9","🏍"],
      ["Bicycles & Personal Mobility","1523275335684-37898b6baf30","🚲"],
      ["Medical Supplies & Healthcare","1542291026-7eec264c27ff","⚕"],
      ["Agriculture & Farm Products","1529139574466-a303027c1d8b","🌾"],
      ["Clothing & Textiles","1490481651871-ab68de25d43d","👕"],
      ["Footwear","1526170375885-4d8ecf77b99f","👟"],
      ["Fashion & Accessories","1503602642458-232111445657","👜"],
      ["Watches & Wearables","1556910103-1c02745aae4d","⌚"],
      ["Electronics & Technology","1556742049-0cfed4f6a45d","💻"],
      ["Home & Furniture","1498837167922-ddd27525d352","🛋"],
      ["Kitchen & Home Appliances","1504674900247-0877df9cc836","🍳"],
      ["Beauty & Personal Care","1512436991641-6745cdb1723f","✨"],
      ["Food & Beverages","1512820790803-83ca734da794","🍎"],
      ["Construction Equipment & Machinery","1528698827591-e19ccd7bc23d","🏗"],
      ["Tools & Hardware","1504148455328-c376907d081c","🔧"],
      ["Industrial Machinery & Equipment","1581091226825-a6a2a5aee158","⚙"],
      ["Steel, Iron & Metal Products","1565793298595-6a879b1d9492","▣"],
      ["Solar & Renewable Energy","1531058020387-3be344556be6","☀"],
      ["Plumbing, Water & Sanitary","1516321318423-f06f85e504b3","🚿"],
      ["Packaging & Printing","1558618666-fcd25c85cd64","📦"],
      ["Office & Business Supplies","1486406146926-c627a92ad1ab","📎"],
      ["Baby & Children's Products","1504307651254-35680f356dfd","🧸"],
      ["Cleaning & Household Supplies","1558618047-3c8c76ca7d13","🧹"],
      ["Bags, Luggage & Travel","1519710164239-da123dc03ef4","🧳"],
      ["Retail & Commercial Equipment","1516979187457-637abb4f9353","🏪"],
      ["Hotel, Restaurant & Catering Equipment","1542744173-8e7e53415bb0","🍽"],
      ["Factory & Production Supplies","1517245386807-bb43f82c33c4","🏭"],
      ["Marine & Port Equipment","1524758631624-e2822e304c36","⚓"],
      ["Logistics, Transport & Warehousing Equipment","1509099836639-18ba1795216d","🚚"],
      ["Building Materials","1523413651479-597eb2da0ad6","🧱"],
      ["Electrical & Power Equipment","1473448912268-2022ce9509d8","🔌"],
      ["Telecommunications & Networking","1486406146926-c627a92ad1ab","📡"],
      ["Industrial Materials","1528712306091-ed0763094c98","🧪"],
      ["General Merchandise","1500534623283-312aade485b7","🛍"],
      ["Import, Export & Trade Services","1509395176047-4a66953fd231","🌐"]
    ];

    const colors = ["#b42318","#7f56d9","#027a48","#175cd3","#b54708","#c11574","#026aa2","#6941c6","#344054","#0e9384"];
    const fallback = (emoji, title, color) => "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="'+color+'"/><stop offset="1" stop-color="#071f30"/></linearGradient></defs><rect width="800" height="420" fill="url(#g)"/><circle cx="690" cy="80" r="150" fill="white" opacity=".08"/><circle cx="90" cy="350" r="180" fill="white" opacity=".06"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-size="92">'+emoji+'</text><text x="50%" y="80%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="white">'+title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</text></svg>'
    );

    const style = document.createElement('style');
    style.id = 'vtgTradeCarouselStyles';
    style.textContent = `
      #vtgTradeCarousel{margin-top:28px;position:relative}
      #vtgTradeCarousel .vtgCarouselHead{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:14px}
      #vtgTradeCarousel .vtgCarouselHead h3{margin:0;color:var(--navy);font-size:21px}
      #vtgTradeCarousel .vtgCarouselHead span{font-size:9px;color:var(--muted)}
      #vtgTradeCarousel .vtgViewport{overflow:hidden;border-radius:18px}
      #vtgTradeCarousel .vtgTrack{display:flex;gap:14px;transition:transform .65s cubic-bezier(.16,1,.3,1);will-change:transform}
      #vtgTradeCarousel .vtgSlide{flex:0 0 calc((100% - 42px)/4);min-width:0;background:var(--white);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 8px 25px rgba(9,38,58,.07)}
      #vtgTradeCarousel .vtgSlide img{display:block;width:100%;height:145px;object-fit:cover;background:var(--soft)}
      #vtgTradeCarousel .vtgSlideBody{padding:11px 12px 13px}
      #vtgTradeCarousel .vtgSlideBody strong{display:block;font-size:10px;line-height:1.35;color:var(--ink)}
      #vtgTradeCarousel .vtgAccent{width:28px;height:3px;border-radius:999px;margin-bottom:8px}
      #vtgTradeCarousel .vtgControls{display:flex;gap:7px}
      #vtgTradeCarousel .vtgControls button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--white);color:var(--ink);cursor:pointer;font-size:16px}
      #vtgTradeCarousel .vtgControls button:hover{border-color:var(--teal);color:var(--teal)}
      @media(max-width:950px){#vtgTradeCarousel .vtgSlide{flex-basis:calc((100% - 14px)/2)}}
      @media(max-width:600px){#vtgTradeCarousel .vtgSlide{flex-basis:100%}#vtgTradeCarousel .vtgSlide img{height:190px}#vtgTradeCarousel .vtgCarouselHead{align-items:center}}
    `;
    document.head.appendChild(style);

    const root = document.createElement('section');
    root.id = 'vtgTradeCarousel';
    root.innerHTML = `
      <div class="vtgCarouselHead">
        <div><h3>Explore Trade Categories</h3><span>Product-focused visuals across the VTG marketplace</span></div>
        <div class="vtgControls"><button type="button" aria-label="Previous category">‹</button><button type="button" aria-label="Next category">›</button></div>
      </div>
      <div class="vtgViewport"><div class="vtgTrack"></div></div>
    `;
    market.appendChild(root);

    const track = root.querySelector('.vtgTrack');
    categories.forEach(([title,id,emoji],i)=>{
      const color = colors[i % colors.length];
      const img = 'https://images.unsplash.com/photo-'+id+'?auto=format&fit=crop&w=1000&q=82';
      const card = document.createElement('article');
      card.className='vtgSlide';
      card.innerHTML=`<img loading="lazy" src="${img}" alt="${title}" data-fallback="${fallback(emoji,title,color)}"><div class="vtgSlideBody"><div class="vtgAccent" style="background:${color}"></div><strong>${title}</strong></div>`;
      const image=card.querySelector('img');
      image.addEventListener('error',()=>{image.src=image.dataset.fallback;},{once:true});
      track.appendChild(card);
    });

    let index=0, timer=null;
    const getVisible=()=>window.innerWidth<=600?1:(window.innerWidth<=950?2:4);
    const render=()=>{
      const visible=getVisible();
      const max=Math.max(0,categories.length-visible);
      index=Math.min(index,max);
      const first=track.querySelector('.vtgSlide');
      if(!first)return;
      const step=first.getBoundingClientRect().width+14;
      track.style.transform=`translate3d(-${index*step}px,0,0)`;
    };
    const next=()=>{const max=Math.max(0,categories.length-getVisible());index=index>=max?0:index+1;render();};
    const prev=()=>{const max=Math.max(0,categories.length-getVisible());index=index<=0?max:index-1;render();};
    root.querySelectorAll('.vtgControls button')[0].addEventListener('click',()=>{prev();restart();});
    root.querySelectorAll('.vtgControls button')[1].addEventListener('click',()=>{next();restart();});
    const restart=()=>{clearInterval(timer);timer=setInterval(next,3000);};
    root.addEventListener('mouseenter',()=>clearInterval(timer));
    root.addEventListener('mouseleave',restart);
    window.addEventListener('resize',render);
    requestAnimationFrame(()=>{render();restart();});
  }

  function apply(){
    try{upgradeAI();loadLiveMarket();replaceMarketplaceIntro();installTradeCarousel();setInterval(loadLiveMarket,300000);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();