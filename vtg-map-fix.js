(()=>{
  const CSS='https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css';
  const css=()=>{if(!document.querySelector('link[data-vtg-maplibre-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.vtgMaplibreCss='1';document.head.appendChild(l)}};
  const ensureEnhancer=()=>new Promise(resolve=>{
    if(typeof window.VTGInitMap==='function') return resolve();
    const existing=document.querySelector('script[data-vtg-map-enhancer]');
    if(existing){existing.addEventListener('load',()=>resolve(),{once:true});setTimeout(resolve,1200);return}
    const s=document.createElement('script');s.src='/map-enhancer.js?v=20260815';s.dataset.vtgMapEnhancer='1';s.onload=()=>resolve();s.onerror=()=>resolve();document.head.appendChild(s);
  });
  const init=async()=>{
    css();
    try{await ensureEnhancer();if(typeof window.VTGInitMap==='function')window.VTGInitMap();}
    catch(e){console.warn('VTG map initialization',e)}
  };
  function wire(){
    const btn=document.getElementById('mapBtn');
    if(btn&&!btn.dataset.vtgMapFix){
      btn.dataset.vtgMapFix='1';
      btn.addEventListener('click',()=>setTimeout(init,160),{capture:true});
    }
    const drawer=document.getElementById('mapDrawer');
    if(drawer&&!drawer.dataset.vtgMapFix){
      drawer.dataset.vtgMapFix='1';
      new MutationObserver(()=>{
        if(drawer.classList.contains('open'))setTimeout(init,120);
      }).observe(drawer,{attributes:true,attributeFilter:['class']});
    }
    if(drawer&&drawer.classList.contains('open'))setTimeout(init,120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();