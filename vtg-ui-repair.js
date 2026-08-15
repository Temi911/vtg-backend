(() => {
  const FALLBACKS = {
    hero: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=85&w=1200&auto=format&fit=crop',
    logistics: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1200&auto=format&fit=crop',
    business: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=85&w=1200&auto=format&fit=crop'
  };
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
      if(img.dataset.vtgBrandRepair) return; img.dataset.vtgBrandRepair='1'; img.src='/assets/vtg-logo-final.webp?v=20260815'; img.alt='Vintage Trade Global — Africa Trade Platform';
      img.addEventListener('error',()=>{img.style.display='none'; const f=img.parentElement?.querySelector('.brandFallback'); if(f) f.style.display='grid';},{once:true});
    });
  }
  function repairImages(){
    document.querySelectorAll('.tradeCard img').forEach((img,i)=>{
      if(img.dataset.vtgRepair) return; img.dataset.vtgRepair='1'; const fallback=i===0?FALLBACKS.hero:i===1?FALLBACKS.logistics:FALLBACKS.business;
      img.addEventListener('error',()=>{if(img.dataset.vtgFallbackApplied)return; img.dataset.vtgFallbackApplied='1'; img.src=fallback;},{once:true});
      if(!img.src||(img.complete&&img.naturalWidth===0)) img.src=fallback;
    });
  }
  function consolidateCalculators(){
    // vtg-cart-calculator.js is the canonical interactive calculator/cart. If it exists,
    // remove the older inline landed-cost calculator injected by vtg-market-news.js.
    if($('calcDrawer') && $('vtgLandedCost')) $('vtgLandedCost').remove();
  }
  function enforceSansSerif(){
    if(document.getElementById('vtgSansSerifPolicy')) return;
    const s=document.createElement('style'); s.id='vtgSansSerifPolicy'; s.textContent='body,button,input,select,textarea{font-family:Arial,Helvetica,sans-serif!important}'; document.head.appendChild(s);
  }
  function bindCore(){
    const once=(id,fn)=>{const el=$(id); if(!el||el.dataset.vtgRepairClick)return; el.dataset.vtgRepairClick='1'; el.addEventListener('click',fn);};
    once('newsBtn',()=>openDrawer('newsDrawer')); once('newsOpen',()=>openDrawer('newsDrawer')); once('heroNews',()=>openDrawer('newsDrawer')); once('footNews',e=>{e.preventDefault();openDrawer('newsDrawer')});
    once('mapBtn',()=>{openDrawer('mapDrawer');setTimeout(()=>{try{window.VTGInitMap?.()}catch(e){console.warn('VTG map init',e)}},180)});
    once('footMap',e=>{e.preventDefault();$('mapBtn')?.click()});
    once('aiLaunch',()=>$('aiPanel')?.classList.add('open')); once('aiClose',()=>$('aiPanel')?.classList.remove('open')); once('footAi',e=>{e.preventDefault();$('aiLaunch')?.click()});
    document.querySelectorAll('[data-close]').forEach(el=>{if(el.dataset.vtgRepairClick)return;el.dataset.vtgRepairClick='1';el.addEventListener('click',()=>closeDrawer(el.dataset.close))});
    document.querySelectorAll('.drawer').forEach(drawer=>{if(drawer.dataset.vtgBackdrop)return;drawer.dataset.vtgBackdrop='1';drawer.addEventListener('click',e=>{if(e.target===drawer)closeDrawer(drawer.id)})});
    if(!document.body.dataset.vtgEscape){document.body.dataset.vtgEscape='1';document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;document.querySelectorAll('.drawer.open').forEach(d=>closeDrawer(d.id));$('aiPanel')?.classList.remove('open');$('authModal')?.classList.remove('open');document.body.style.overflow=''})}
  }
  function bindMapFallbackControls(){
    const search=$('mapSearchBtn'),input=$('mapSearch'),locate=$('locateBtn');
    if(search&&!search.dataset.vtgRepairClick){search.dataset.vtgRepairClick='1';search.addEventListener('click',()=>window.VTGInitMap?.())}
    if(input&&!input.dataset.vtgRepairKey){input.dataset.vtgRepairKey='1';input.addEventListener('keydown',e=>{if(e.key==='Enter')window.VTGInitMap?.()})}
    if(locate&&!locate.dataset.vtgRepairClick){locate.dataset.vtgRepairClick='1';locate.addEventListener('click',()=>{const map=window.__vtgMap;if(map&&navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:12,duration:900}),()=>window.VTGInitMap?.());else window.VTGInitMap?.()})}
  }
  function run(){loadIcons();repairBranding();repairImages();consolidateCalculators();enforceSansSerif();bindCore();bindMapFallbackControls();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  setTimeout(run,500);setTimeout(run,1500);setTimeout(run,3000);
})();
