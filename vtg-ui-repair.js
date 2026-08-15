(() => {
  const FALLBACKS = {
    hero: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=85&w=1200&auto=format&fit=crop',
    logistics: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1200&auto=format&fit=crop',
    business: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=85&w=1200&auto=format&fit=crop'
  };
  const NEWS_FALLBACKS = [
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=85&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=85&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1000&auto=format&fit=crop'
  ];
  const $ = id => document.getElementById(id);
  const closeDrawer = id => { const el=$(id); if(el) el.classList.remove('open'); document.body.style.overflow=''; };
  const openDrawer = id => { const el=$(id); if(!el) return; el.classList.add('open'); document.body.style.overflow='hidden'; };

  function loadIcons(){
    if(window.lucide?.createIcons) return window.lucide.createIcons({attrs:{'stroke-width':1.9}});
    if(!document.querySelector('script[data-vtg-lucide-repair]')){
      const s=document.createElement('script'); s.src='https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js'; s.defer=true; s.dataset.vtgLucideRepair='1';
      s.onload=()=>window.lucide?.createIcons?.({attrs:{'stroke-width':1.9}}); document.head.appendChild(s);
    }
  }
  function repairBranding(){
    document.querySelectorAll('.brandLogo').forEach(img=>{
      img.dataset.vtgBrandRepair='1'; img.src='/assets/vtg-logo-final.webp?v=20260815'; img.alt='Vintage Trade Global — Africa Trade Platform';
      img.addEventListener('error',()=>{img.style.display='none'; const f=img.parentElement?.querySelector('.brandFallback'); if(f) f.style.display='grid';},{once:true});
    });
  }
  function repairImages(){
    document.querySelectorAll('.tradeCard img').forEach((img,i)=>{
      if(img.dataset.vtgRepair) return; img.dataset.vtgRepair='1'; const fallback=i===0?FALLBACKS.hero:i===1?FALLBACKS.logistics:FALLBACKS.business;
      img.addEventListener('error',()=>{if(img.dataset.vtgFallbackApplied)return;img.dataset.vtgFallbackApplied='1';img.src=fallback},{once:true});
      if(!img.src||(img.complete&&img.naturalWidth===0))img.src=fallback;
    });
  }
  function styleNews(){
    if($('vtgNewsImageStyle'))return;
    const s=document.createElement('style');s.id='vtgNewsImageStyle';s.textContent=`.newsLarge article{display:grid;grid-template-columns:150px 1fr;gap:0;overflow:hidden}.newsLarge article .vtgNewsImage{width:150px;height:112px;object-fit:cover;background:#eaf2f4}.newsLarge article .liveNewsBody{min-width:0}.newsPreview .newsItem{display:grid!important;grid-template-columns:74px 1fr;gap:10px;align-items:center}.newsPreview .newsItem img{width:74px!important;height:54px!important;object-fit:cover!important;border-radius:8px;background:#eaf2f4}@media(max-width:600px){.newsLarge article{grid-template-columns:110px 1fr}.newsLarge article .vtgNewsImage{width:110px;height:100%}}`;
    document.head.appendChild(s);
  }
  function bindMarketImages(){
    if(window.__vtgNewsImageBridge)return;window.__vtgNewsImageBridge=true;styleNews();
    window.addEventListener('vtg:market-ready',e=>{
      const items=e.detail?.news||[]; if(!items.length)return;
      const articles=[...document.querySelectorAll('.newsLarge article')];
      articles.forEach((article,i)=>{
        const item=items[i]; if(!item)return;
        const src=item.image||item.imageUrl||item.urlToImage||item.thumbnail||item.image_url||NEWS_FALLBACKS[i%NEWS_FALLBACKS.length];
        let img=article.querySelector('.vtgNewsImage');
        if(!img){img=document.createElement('img');img.className='vtgNewsImage';img.alt='News image';article.prepend(img)}
        img.src=src;img.onerror=()=>{img.onerror=null;img.src=NEWS_FALLBACKS[i%NEWS_FALLBACKS.length]};
      });
      document.querySelectorAll('.newsPreview .newsItem').forEach((row,i)=>{
        const item=items[i];if(!item)return;const src=item.image||item.imageUrl||item.urlToImage||item.thumbnail||item.image_url||NEWS_FALLBACKS[i%NEWS_FALLBACKS.length];let img=row.querySelector('img');if(!img){img=document.createElement('img');row.prepend(img)}img.src=src;img.alt='News image';img.onerror=()=>{img.onerror=null;img.src=NEWS_FALLBACKS[i%NEWS_FALLBACKS.length]};
      });
    });
  }
  function consolidateCalculators(){if($('calcDrawer')&&$('vtgLandedCost'))$('vtgLandedCost').remove();}
  function enforceSansSerif(){if(document.getElementById('vtgSansSerifPolicy'))return;const s=document.createElement('style');s.id='vtgSansSerifPolicy';s.textContent='body,button,input,select,textarea{font-family:Arial,Helvetica,sans-serif!important}';document.head.appendChild(s);}
  function loadTradeMap(){
    if(window.VTGInitTradeMap)return window.VTGInitTradeMap();
    if(document.querySelector('script[data-vtg-trade-map-loader]'))return;
    const s=document.createElement('script');s.src='/vtg-trade-map.js?v=20260815';s.dataset.vtgTradeMapLoader='1';s.onload=()=>window.VTGInitTradeMap?.();document.head.appendChild(s);
  }
  function bindCore(){
    const once=(id,fn)=>{const el=$(id);if(!el||el.dataset.vtgRepairClick)return;el.dataset.vtgRepairClick='1';el.addEventListener('click',fn)};
    once('newsBtn',()=>openDrawer('newsDrawer'));once('newsOpen',()=>openDrawer('newsDrawer'));once('heroNews',()=>openDrawer('newsDrawer'));once('footNews',e=>{e.preventDefault();openDrawer('newsDrawer')});
    once('mapBtn',()=>{openDrawer('mapDrawer');setTimeout(loadTradeMap,120)});once('footMap',e=>{e.preventDefault();$('mapBtn')?.click()});
    once('aiLaunch',()=>$('aiPanel')?.classList.add('open'));once('aiClose',()=>$('aiPanel')?.classList.remove('open'));once('footAi',e=>{e.preventDefault();$('aiLaunch')?.click()});
    document.querySelectorAll('[data-close]').forEach(el=>{if(el.dataset.vtgRepairClick)return;el.dataset.vtgRepairClick='1';el.addEventListener('click',()=>closeDrawer(el.dataset.close))});
    document.querySelectorAll('.drawer').forEach(drawer=>{if(drawer.dataset.vtgBackdrop)return;drawer.dataset.vtgBackdrop='1';drawer.addEventListener('click',e=>{if(e.target===drawer)closeDrawer(drawer.id)})});
    if(!document.body.dataset.vtgEscape){document.body.dataset.vtgEscape='1';document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;document.querySelectorAll('.drawer.open').forEach(d=>closeDrawer(d.id));$('aiPanel')?.classList.remove('open');$('authModal')?.classList.remove('open');document.body.style.overflow=''})}
  }
  function bindLegacyMapControls(){
    document.querySelectorAll('#mapSearchBtn,#locateBtn').forEach(el=>{if(el.dataset.vtgLegacyDisabled)return;el.dataset.vtgLegacyDisabled='1';el.addEventListener('click',()=>loadTradeMap())});
    const input=$('mapSearch');if(input&&!input.dataset.vtgRepairKey){input.dataset.vtgRepairKey='1';input.addEventListener('keydown',e=>{if(e.key==='Enter')loadTradeMap()})}
  }
  function run(){loadIcons();repairBranding();repairImages();consolidateCalculators();enforceSansSerif();bindMarketImages();bindCore();bindLegacyMapControls();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  setTimeout(run,500);setTimeout(run,1500);setTimeout(run,3000);
})();