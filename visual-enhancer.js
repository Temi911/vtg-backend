(() => {
  function loadLiveMarket() {
    fetch('/api/market/dashboard', {cache:'no-store', headers:{Accept:'application/json'}})
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const news = Array.isArray(d.news) ? d.news : [];
        if (!news.length) return;
        const ticker = document.querySelector('.ticker span');
        if (ticker) ticker.textContent = news.slice(0,10).map(x => x.title).join(' • ');
        [...document.querySelectorAll('.newsItem')].slice(0,2).forEach((row,i) => {
          const item = news[i]; if (!item) return;
          const b=row.querySelector('b'), m=row.querySelector('small'), im=row.querySelector('img');
          if (b) b.textContent=item.title || 'Current trade-market signal';
          if (m) m.textContent=(item.source || 'VTG market feed')+' • '+new Date(item.published || Date.now()).toLocaleDateString();
          if (im && item.image) im.src=item.image;
        });
      }).catch(() => {});
  }

  function upgradeAI() {
    const form=document.querySelector('#aiForm'), input=document.querySelector('#aiInput'), msgs=document.querySelector('#aiMsgs');
    if (!form || !input || !msgs || form.dataset.vtgAiEnhanced) return;
    form.dataset.vtgAiEnhanced='1';
    const history=[];
    form.onsubmit=async e => {
      e.preventDefault();
      const q=input.value.trim(); if(!q) return;
      const add=(role,t)=>{const d=document.createElement('div');d.className='msg '+role;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;};
      add('user',q); input.value=''; history.push({role:'user',content:q});
      try {
        const c=new AbortController(), timer=setTimeout(()=>c.abort(),30000);
        const r=await fetch('/api/ai/public-chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:q,history:history.slice(-20),country:'Nigeria',role:localStorage.getItem('vtg_role')||'buyer',live:true,currentDate:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,page:location.href}),signal:c.signal});
        clearTimeout(timer); const d=await r.json(); if(!r.ok) throw new Error();
        const reply=d.reply||d.message||'I could not generate a response right now.';
        add('assistant',reply); history.push({role:'assistant',content:reply});
        if(Array.isArray(d.citations)&&d.citations.length){
          const src=document.createElement('div'); src.className='msg assistant';
          src.innerHTML='<small>Sources: '+d.citations.map(s=>'<a href="'+String(s.url||'#').replace(/"/g,'&quot;')+'" target="_blank" rel="noopener noreferrer">'+String(s.title||'Source').replace(/[&<>]/g,'')+'</a>').join(' • ')+'</small>';
          msgs.appendChild(src); msgs.scrollTop=msgs.scrollHeight;
        }
      } catch(err) { add('assistant','I’m temporarily unable to connect to the VTG AI service. Please try again shortly.'); }
    };
  }

  function replaceMarketplaceIntro() {
    const intro=document.querySelector('.market .sectionHead p');
    if(intro) intro.textContent='Trade Documents & Compliance — Keep invoices, packing lists, shipping records and compliance steps organized around each transaction.';
  }

  function upgradeMarketIntelligence() {
    const section=document.querySelector('#intelligence');
    if(!section || section.dataset.vtgIntelEnhanced) return;
    section.dataset.vtgIntelEnhanced='1';

    const head=section.querySelector('.sectionHead');
    if(head && !head.querySelector('.vtgIntelActions')){
      const actions=document.createElement('div');
      actions.className='vtgIntelActions';
      actions.innerHTML='<button type="button" class="outline" data-vtg-intel-news>Open live market news</button><button type="button" class="primary" data-vtg-intel-ai>Ask VTG AI</button>';
      head.appendChild(actions);
      actions.querySelector('[data-vtg-intel-news]').onclick=()=>{const d=document.getElementById('newsDrawer');if(d){d.classList.add('open');document.body.style.overflow='hidden';}};
      actions.querySelector('[data-vtg-intel-ai]').onclick=()=>{const p=document.getElementById('aiPanel');if(p)p.classList.add('open');};
    }

    const rows=[...section.querySelectorAll('.intelRow')];
    const labels=['LIVE FEED','LIVE FEED','LIVE FEED','AVAILABLE','PLANNED','AVAILABLE'];
    rows.forEach((row,i)=>{const badge=row.querySelector('em');if(badge&&labels[i])badge.textContent=labels[i];});

    if(!document.getElementById('vtgIntelEnhancerStyles')){
      const style=document.createElement('style');
      style.id='vtgIntelEnhancerStyles';
      style.textContent='.vtgIntelActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px}.vtgIntelActions button{font-size:9px;padding:9px 12px}.vtgIntelActions .outline{background:var(--white);border-color:var(--line);color:var(--navy)}@media(max-width:700px){.vtgIntelActions{justify-content:flex-start}}';
      document.head.appendChild(style);
    }
  }

  function installVTGCarousel() {
    const old=document.querySelector('#vtgProductCarousel');
    if(old) old.remove();
    const market=document.querySelector('.market .section');
    if(!market) return;

    const categories=[
      ['Cars & Automobiles','car'],['Motorcycles, Tricycles & Mobility','bike'],['Bicycles & Personal Mobility','bike'],
      ['Medical Supplies & Healthcare','heart-pulse'],['Agriculture & Farm Products','wheat'],['Clothing & Textiles','shirt'],
      ['Footwear','footprints'],['Fashion & Accessories','shopping-bag'],['Watches & Wearables','watch'],['Electronics & Technology','laptop'],
      ['Home & Furniture','sofa'],['Kitchen & Home Appliances','utensils'],['Beauty & Personal Care','sparkles'],['Food & Beverages','utensils-crossed'],
      ['Construction Equipment & Machinery','construction'],['Tools & Hardware','wrench'],['Industrial Machinery & Equipment','factory'],
      ['Steel, Iron & Metal Products','layers-3'],['Solar & Renewable Energy','sun'],['Plumbing, Water & Sanitary','shower-head'],
      ['Packaging & Printing','package'],['Office & Business Supplies','paperclip'],['Baby & Children Products','baby'],
      ['Cleaning & Household Supplies','brush-cleaning'],['Bags, Luggage & Travel','luggage'],['Retail & Commercial Equipment','store'],
      ['Hotel, Restaurant & Catering Equipment','utensils'],['Factory & Production Supplies','factory'],['Marine & Port Equipment','anchor'],
      ['Logistics, Transport & Warehousing Equipment','truck'],['Building Materials','brick-wall'],['Electrical & Power Equipment','plug-zap'],
      ['Telecommunications & Networking','radio-tower'],['Industrial Materials','boxes'],['General Merchandise','shopping-basket'],
      ['Import, Export & Trade Services','globe-2']
    ];

    const images={
      'Cars & Automobiles':'https://hips.hearstapps.com/hmg-prod/images/5ae0e9e1-a5de-4176-9a47-9bfb397e9d22.jpeg?crop=0.74945xw%3A1xh%3Bcenter%2Ctop&resize=1200%3A%2A',
      'Motorcycles, Tricycles & Mobility':'https://factoryorder.oss-cn-chengdu.aliyuncs.com/uploads/admin/2022/04/07/200CC250CC300CCclassicalandhotsellingmodels%289%29_30885.jpg',
      'Bicycles & Personal Mobility':'https://assets.newatlas.com/dims4/default/ea73d8b/2147483647/strip/true/crop/1620x1080%2B0%2B0/resize/1620x1080%21/format/webp/quality/85/?url=https%3A%2F%2Fnewatlas-brightspot.s3.amazonaws.com%2Farchive%2F506A7544.jpg',
      'Medical Supplies & Healthcare':'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1600&q=85',
      'Agriculture & Farm Products':'https://cloudfront-eu-central-1.images.arcpublishing.com/williamreed/HWAY4IBGKBKI5FN34NRFXPALMQ.jpg',
      'Clothing & Textiles':'https://www.mgm-ethiopia.com/assets/textiles-BF6a4IiE.jpg',
      'Footwear':'https://www.bayxbengal.com/industries/footwear.webp',
      'Fashion & Accessories':'https://claudioandco.com/cdn/shop/articles/IMG_0282.jpg?v=1772215671&width=1500',
      'Watches & Wearables':'https://cdn.mos.cms.futurecdn.net/z7vsVze8PmDsTxRzYPmy5.jpg',
      'Electronics & Technology':'https://knjiznica-trzic.splet.arnes.si/files/2024/09/Phones-1.jpg',
      'Home & Furniture':'https://www.ifurniture.co.nz/images/thumbs/0064512_lancaster-fabric-sofa-range-grey-2-seater.jpeg',
      'Kitchen & Home Appliances':'https://i.postimg.cc/W4xx6fsb/IMG-0708.jpg',
      'Beauty & Personal Care':'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1600&q=85',
      'Food & Beverages':'https://supplier-offers-media-production.s3.eu-central-1.amazonaws.com/5bebefe9-0732-11f1-818e-0a58a9feac02.png',
      'Construction Equipment & Machinery':'https://cdn.prod.website-files.com/66fc1033a0da8fd78b2a4365/67a22915cb3ecbc7698dea23_thumbnail.jpeg',
      'Tools & Hardware':'https://crownksa.com/static/images/categories/hardware-banner.jpg',
      'Industrial Machinery & Equipment':'https://gbres.dfcfw.com/Files/iimage/20250104/BB2DB91D06947BB58683EC4A915EBE2B_w1080h720.jpg',
      'Steel, Iron & Metal Products':'https://irp-cdn.multiscreensite.com/9fec2152/dms3rep/multi/Cartagena-bodega-chipa-Agofer-e1201e26.JPG',
      'Solar & Renewable Energy':'https://www.sunners.com.br/images/equipamentos-de-energia-solar-fotovoltaica-01.webp',
      'Plumbing, Water & Sanitary':'https://hilitebmt.com/static/2fcdba86c15cc1f4f70cb20e38f94f3d/3564b/sanitary-items.jpg',
      'Packaging & Printing':'https://images.ctfassets.net/cma41nsiygxr/65KW26r0jd0J8WPmf2jtrk/fdc314fdceb622ca4e39df42e848504c/box_cat-boxes-for-objects_3.jpg',
      'Office & Business Supplies':'https://eu.evocdn.io/dealer/1898/content/media/Content_Pages/large-office-supplies-stationery-1.jpg',
      'Baby & Children Products':'https://static.ticimax.cloud/cdn-cgi/image/width%3D-%2Cquality%3D99/6806/uploads/blog/cocuklarin-hayal-dunyasinda-yolculuk-toy-4eae.jpg',
      'Cleaning & Household Supplies':'https://radioclub.ua/upload/editor/00/2025/84/e3/6784ffbb147d4_osnovnoe-uborka.jpg',
      'Bags, Luggage & Travel':'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=85',
      'Retail & Commercial Equipment':'https://img.waimaoniu.net/2456/2456-202509291705011260.jpg',
      'Hotel, Restaurant & Catering Equipment':'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=85',
      'Factory & Production Supplies':'https://gbres.dfcfw.com/Files/iimage/20250104/BB2DB91D06947BB58683EC4A915EBE2B_w1080h720.jpg',
      'Marine & Port Equipment':'https://multimedia.elpais.com.co/2023/07_julio/500_empresas/img_editorial/art1.jpg',
      'Logistics, Transport & Warehousing Equipment':'https://www.klikovacdoo.com/images/Hale-i-magacini/Galerija/Hale_i_magacini_003.jpg',
      'Building Materials':'https://ferreteriachacabuco.cl/cdn/shop/articles/fd27443c-f441-4964-938e-c24e25948095.png?v=1772467913&width=1500',
      'Electrical & Power Equipment':'https://specap.com/_next/image?dpl=dpl_GR1mkvn39potgZieQaYjJ6YZHFpS&q=75&url=%2Fimages%2Fblog%2Fpower-electronics.webp&w=3840',
      'Telecommunications & Networking':'https://www.nokia.com/sites/default/files/2024-05/resrcid34724_7750_sr_-2se-001-1920x1080.jpg?height=774&width=1376',
      'Industrial Materials':'https://raw-material.stinternational.org/resources/hero-industrial.jpg',
      'General Merchandise':'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=85',
      'Import, Export & Trade Services':'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=85'
    };

    const style=document.createElement('style');
    style.id='vtgCarouselRebuildStyles';
    style.textContent=`
      #vtgProductCarousel{margin-top:24px;position:relative;z-index:5}
      #vtgProductCarousel .vtgStage{position:relative;height:390px;overflow:hidden;border-radius:22px;background:#111;box-shadow:0 18px 45px rgba(7,31,48,.16)}
      #vtgProductCarousel .vtgSlide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .5s ease;display:flex}
      #vtgProductCarousel .vtgSlide.active{opacity:1;visibility:visible}
      #vtgProductCarousel .vtgSlide img{width:100%;height:100%;object-fit:cover;display:block}
      #vtgProductCarousel .vtgShade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02) 35%,rgba(0,0,0,.82));pointer-events:none}
      #vtgProductCarousel .vtgInfo{position:absolute;left:26px;bottom:25px;right:70px;color:#fff;z-index:3}
      #vtgProductCarousel .vtgInfo small{display:block;font-size:10px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;margin-bottom:5px}
      #vtgProductCarousel .vtgInfo strong{display:block;font-size:clamp(22px,3vw,34px);line-height:1.1}
      #vtgProductCarousel .vtgCount{display:block;font-size:10px;opacity:.8;margin-top:6px}
      #vtgProductCarousel .vtgPrev,#vtgProductCarousel .vtgNext{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(0,0,0,.38);color:#fff;font-size:30px;cursor:pointer}
      #vtgProductCarousel .vtgPrev{left:14px}#vtgProductCarousel .vtgNext{right:14px}
      #vtgProductCarousel .vtgDots{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin-top:10px}
      #vtgProductCarousel .vtgDot{width:7px;height:7px;border:0;border-radius:50%;padding:0;background:#c7ced3;cursor:pointer}
      #vtgProductCarousel .vtgDot.active{background:#9c241d;transform:scale(1.35)}
      @media(max-width:600px){#vtgProductCarousel .vtgStage{height:300px;border-radius:17px}#vtgProductCarousel .vtgInfo{left:18px;bottom:18px}#vtgProductCarousel .vtgPrev,#vtgProductCarousel .vtgNext{width:36px;height:36px;font-size:24px}}
    `;
    document.head.appendChild(style);

    const wrap=document.createElement('section');
    wrap.id='vtgProductCarousel';
    wrap.innerHTML='<div class="vtgStage"><div class="vtgSlides"></div><button class="vtgPrev" type="button" aria-label="Previous category"><i data-lucide="chevron-left"></i></button><button class="vtgNext" type="button" aria-label="Next category"><i data-lucide="chevron-right"></i></button><div class="vtgShade"></div><div class="vtgInfo"><small>VTG Marketplace</small><span class="vtgIcon"><i data-lucide="shopping-bag"></i></span><strong></strong><span class="vtgCount"></span></div></div><div class="vtgDots"></div>'

    const slides=wrap.querySelector('.vtgSlides'), dots=wrap.querySelector('.vtgDots'), title=wrap.querySelector('.vtgInfo strong'), count=wrap.querySelector('.vtgCount');
    const fallback=(name,i)=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#18232d"/><text x="70" y="380" fill="#fff" font-family="Arial" font-size="54" font-weight="700">'+name.replace(/[&<>]/g,'')+'</text><text x="70" y="430" fill="#b9c5ce" font-family="Arial" font-size="22">VTG MARKETPLACE</text></svg>');

    categories.forEach(([name],i)=>{
      const slide=document.createElement('div'); slide.className='vtgSlide'+(i===0?' active':'');
      const img=document.createElement('img'); img.alt=name; img.loading=i===0?'eager':'lazy'; img.src=images[name]||fallback(name,i);
      img.onerror=()=>{img.onerror=null;img.src=fallback(name,i);};
      slide.appendChild(img); slides.appendChild(slide);
      const dot=document.createElement('button'); dot.className='vtgDot'+(i===0?' active':''); dot.type='button'; dot.title=name; dot.setAttribute('aria-label','Show '+name); dot.dataset.icon=categories[i][1]; dots.appendChild(dot);
    });

    let index=0,timer;
    function show(n){slides.children[index].classList.remove('active');dots.children[index].classList.remove('active');index=(n+categories.length)%categories.length;slides.children[index].classList.add('active');dots.children[index].classList.add('active');title.textContent=categories[index][0];count.textContent=(index+1)+' / '+categories.length; const icon=wrap.querySelector('.vtgIcon'); if(icon) icon.innerHTML='<i data-lucide="'+categories[index][1]+'"></i>'; if(window.lucide?.createIcons)window.lucide.createIcons();}
    function restart(){clearInterval(timer);timer=setInterval(()=>show(index+1),3000);}
    dots.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{show(i);restart();});
    wrap.querySelector('.vtgPrev').onclick=()=>{show(index-1);restart();};
    wrap.querySelector('.vtgNext').onclick=()=>{show(index+1);restart();};
    title.textContent=categories[0][0]; count.textContent='1 / '+categories.length;
    market.appendChild(wrap);

    const groups=[
      ['Vehicles & Mobility',['Cars & Automobiles','Motorcycles, Tricycles & Mobility','Bicycles & Personal Mobility']],
      ['Health & Agriculture',['Medical Supplies & Healthcare','Agriculture & Farm Products']],
      ['Fashion & Lifestyle',['Clothing & Textiles','Footwear','Fashion & Accessories','Watches & Wearables','Beauty & Personal Care','Baby & Children Products','Bags, Luggage & Travel']],
      ['Electronics & Power',['Electronics & Technology','Solar & Renewable Energy','Electrical & Power Equipment','Telecommunications & Networking']],
      ['Home & Hospitality',['Home & Furniture','Kitchen & Home Appliances','Cleaning & Household Supplies','Hotel, Restaurant & Catering Equipment']],
      ['Industrial & Construction',['Construction Equipment & Machinery','Tools & Hardware','Industrial Machinery & Equipment','Steel, Iron & Metal Products','Plumbing, Water & Sanitary','Factory & Production Supplies','Building Materials','Industrial Materials']],
      ['Office & Commerce',['Packaging & Printing','Office & Business Supplies','Retail & Commercial Equipment','General Merchandise']],
      ['Food & Trade Services',['Food & Beverages','Import, Export & Trade Services']],
      ['Logistics & Marine',['Marine & Port Equipment','Logistics, Transport & Warehousing Equipment']]
    ];

    const groupNav=document.createElement('div');
    groupNav.className='vtgCategoryGroups';
    groupNav.innerHTML='<div class="vtgGroupHead"><span>Explore categories</span><small>9 groups • 36 product categories</small></div><div class="vtgGroupGrid"></div>';
    const grid=groupNav.querySelector('.vtgGroupGrid');
    const categoryIndex=new Map(categories.map((x,i)=>[x[0],i]));

    groups.forEach(([label,names])=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='vtgGroup';
      button.innerHTML='<span class="vtgGroupIcon"><i data-lucide="'+(names[0]===undefined?'layers':categories[categoryIndex.get(names[0])]?.[1]||'layers')+'"></i></span><span class="vtgGroupLabel">'+label+'</span><b><i data-lucide="arrow-up-right"></i></b>';
      button.title='Explore '+label;
      button.onclick=()=>{
        const target=categoryIndex.get(names[0]);
        if(typeof target==='number'){show(target);restart();wrap.scrollIntoView({behavior:'smooth',block:'center'});}
      };
      grid.appendChild(button);
    });

    style.textContent += `
      #vtgProductCarousel .vtgIcon{display:inline-grid;place-items:center;width:34px;height:34px;margin:8px 0 4px;border:1px solid rgba(255,255,255,.28);border-radius:10px;background:rgba(0,0,0,.22);color:#fff}
      #vtgProductCarousel .vtgIcon svg{width:18px;height:18px;stroke-width:1.8}
      #vtgProductCarousel .vtgPrev svg,#vtgProductCarousel .vtgNext svg{width:19px;height:19px;stroke-width:2}
      #vtgProductCarousel .vtgGroupIcon{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:9px;background:var(--soft,#f5f8f8);color:var(--teal,#c0392b)}
      #vtgProductCarousel .vtgGroupIcon svg{width:16px;height:16px;stroke-width:1.9}
      #vtgProductCarousel .vtgGroupLabel{flex:1}
      #vtgProductCarousel .vtgGroup>b{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;color:var(--muted,#667085);background:var(--soft,#f5f8f8)}
      #vtgProductCarousel .vtgGroup>b svg{width:15px;height:15px;stroke-width:2}
      #vtgProductCarousel .vtgCategoryGroups{margin-top:20px}
      #vtgProductCarousel .vtgGroupHead{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:10px}
      #vtgProductCarousel .vtgGroupHead span{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      #vtgProductCarousel .vtgGroupHead small{font-size:11px;opacity:.65}
      #vtgProductCarousel .vtgGroupGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      #vtgProductCarousel .vtgGroup{display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;padding:14px 15px;border:1px solid rgba(127,143,154,.22);border-radius:14px;background:var(--white,#fff);color:var(--ink,#17212b);cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      #vtgProductCarousel .vtgGroup:hover{transform:translateY(-1px);border-color:rgba(156,36,29,.5);box-shadow:0 8px 22px rgba(7,31,48,.08)}
      #vtgProductCarousel .vtgGroup span{font-size:13px;font-weight:700}
      #vtgProductCarousel .vtgGroup b{font-size:20px;font-weight:400;line-height:1}
      @media(max-width:760px){#vtgProductCarousel .vtgGroupGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:480px){#vtgProductCarousel .vtgGroupGrid{grid-template-columns:1fr}#vtgProductCarousel .vtgGroupHead{align-items:flex-start;flex-direction:column;gap:3px}}
    `;
    wrap.appendChild(groupNav);
    if(window.lucide?.createIcons)window.lucide.createIcons();
    restart();
  }


  function upgradeLandingExperience(){
    const hero=document.querySelector('.hero');
    const heroIn=document.querySelector('.heroIn');
    if(!hero || !heroIn || hero.dataset.vtgLandingEnhanced) return;
    hero.dataset.vtgLandingEnhanced='1';

    const style=document.createElement('style');
    style.id='vtgLandingExperienceStyles';
    style.textContent=`
      .vtgTradeJourney{grid-column:1/-1;position:relative;margin-top:-2px;padding:15px 17px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(7,18,27,.48);backdrop-filter:blur(14px);box-shadow:0 16px 45px rgba(0,0,0,.16)}
      .vtgTradeJourneyHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .vtgTradeJourneyHead strong{font-size:10px;color:#fff;letter-spacing:.14em;text-transform:uppercase}
      .vtgTradeJourneyHead span{font-size:8px;color:#b9ccd5}
      .vtgJourneySteps{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}
      .vtgJourneyStep{position:relative;display:flex;align-items:center;gap:8px;min-width:0;padding:9px 8px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.045);transition:.22s ease}
      .vtgJourneyStep:hover{transform:translateY(-2px);background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22)}
      .vtgJourneyIcon{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:9px;background:rgba(192,57,43,.18);color:#ff9a91}
      .vtgJourneyIcon svg{width:15px;height:15px;stroke-width:1.9}
      .vtgJourneyStep b{display:block;color:#fff;font-size:8px;white-space:nowrap}
      .vtgJourneyStep small{display:block;color:#9fb2bc;font-size:7px;margin-top:2px;white-space:nowrap}
      .vtgLivePill{display:inline-flex;align-items:center;gap:5px;color:#c8e9d8!important}
      .vtgLivePill i{width:6px;height:6px;border-radius:50%;background:#48c98a;box-shadow:0 0 0 4px rgba(72,201,138,.10);animation:vtgLivePulse 1.8s ease-in-out infinite}
      @keyframes vtgLivePulse{50%{opacity:.45;transform:scale(.75)}}
      .vtgValueStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}
      .vtgValueItem{padding:15px 16px;border:1px solid var(--line);border-radius:15px;background:linear-gradient(145deg,var(--white),var(--soft));transition:.2s ease}
      .vtgValueItem:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(7,31,48,.08)}
      .vtgValueTop{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .vtgValueIcon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--soft);color:var(--teal)}
      .vtgValueIcon svg{width:17px;height:17px;stroke-width:1.8}
      .vtgValueItem b{font-size:11px;color:var(--ink)}
      .vtgValueItem p{font-size:9px;line-height:1.55;color:var(--muted);margin:8px 0 0}
      .vtgSectionKicker{display:inline-flex;align-items:center;gap:7px;font-size:8px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--teal)}
      .vtgSectionKicker:before{content:'';width:18px;height:1px;background:currentColor}
      @media(max-width:900px){.vtgJourneySteps{grid-template-columns:repeat(3,1fr)}.vtgValueStrip{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:560px){.vtgTradeJourney{padding:12px}.vtgJourneySteps{grid-template-columns:repeat(2,1fr)}.vtgJourneyStep{padding:8px}.vtgJourneyStep small{white-space:normal}.vtgValueStrip{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const journey=document.createElement('div');
    journey.className='vtgTradeJourney';
    journey.innerHTML=`
      <div class="vtgTradeJourneyHead">
        <strong>Your trade, connected from source to destination</strong>
        <span class="vtgLivePill"><i></i> VTG trade network</span>
      </div>
      <div class="vtgJourneySteps">
        <div class="vtgJourneyStep"><span class="vtgJourneyIcon"><i data-lucide="search"></i></span><span><b>Discover</b><small>Find products</small></span></div>
        <div class="vtgJourneyStep"><span class="vtgJourneyIcon"><i data-lucide="handshake"></i></span><span><b>Trade</b><small>Verified partners</small></span></div>
        <div class="vtgJourneyStep"><span class="vtgJourneyIcon"><i data-lucide="landmark"></i></span><span><b>Finance</b><small>Trade finance</small></span></div>
        <div class="vtgJourneyStep"><span class="vtgJourneyIcon"><i data-lucide="ship"></i></span><span><b>Ship</b><small>Global logistics</small></span></div>
        <div class="vtgJourneyStep"><span class="vtgJourneyIcon"><i data-lucide="map-pin"></i></span><span><b>Track</b><small>Live milestones</small></span></div>
        <div class="vtgJourneyStep"><span class="vtgJourneyIcon"><i data-lucide="package-check"></i></span><span><b>Receive</b><small>Complete the trade</small></span></div>
      </div>
    `;
    heroIn.appendChild(journey);

    const firstSection=document.querySelector('.section');
    if(firstSection){
      const values=document.createElement('div');
      values.className='vtgValueStrip';
      values.innerHTML=`
        <div class="vtgValueItem"><div class="vtgValueTop"><b>Global sourcing</b><span class="vtgValueIcon"><i data-lucide="globe-2"></i></span></div><p>Discover products and trading partners across the VTG Africa–China–World network.</p></div>
        <div class="vtgValueItem"><div class="vtgValueTop"><b>Verified trade</b><span class="vtgValueIcon"><i data-lucide="badge-check"></i></span></div><p>Bring suppliers, buyers, agents and institutions into a more trusted workflow.</p></div>
        <div class="vtgValueItem"><div class="vtgValueTop"><b>Connected logistics</b><span class="vtgValueIcon"><i data-lucide="route"></i></span></div><p>Connect orders to shipment milestones, ports, customs and final delivery.</p></div>
        <div class="vtgValueItem"><div class="vtgValueTop"><b>Trade intelligence</b><span class="vtgValueIcon"><i data-lucide="chart-no-axes-combined"></i></span></div><p>Use VTG AI and market intelligence to make better trade decisions.</p></div>
      `;
      firstSection.insertBefore(values, firstSection.querySelector('.sectionHead')?.nextSibling || null);
    }

    const sectionHeads=document.querySelectorAll('.sectionHead');
    sectionHeads.forEach((h,i)=>{
      if(i===0 && !h.querySelector('.vtgSectionKicker')){
        const k=document.createElement('span'); k.className='vtgSectionKicker'; k.textContent='The VTG ecosystem';
        h.insertBefore(k,h.firstChild);
      }
    });

    if(window.lucide?.createIcons) window.lucide.createIcons({attrs:{'stroke-width':1.9}});
  }

  function apply(){
    try{upgradeAI();loadLiveMarket();replaceMarketplaceIntro();upgradeMarketIntelligence();installVTGCarousel();upgradeLandingExperience();setInterval(loadLiveMarket,300000);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();