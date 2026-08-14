(()=>{
  const CSS='https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css';
  const css=()=>{if(!document.querySelector('link[data-vtg-maplibre-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.vtgMaplibreCss='1';document.head.appendChild(l)}};
  const ensureEnhancer=()=>new Promise(resolve=>{
    if(typeof window.VTGInitMap==='function') return resolve();
    const existing=document.querySelector('script[data-vtg-map-enhancer]');
    if(existing){existing.addEventListener('load',()=>resolve(),{once:true});setTimeout(resolve,900);return}
    const s=document.createElement('script');s.src='/map-enhancer.js?v=20260814';s.dataset.vtgMapEnhancer='1';s.onload=()=>resolve();s.onerror=()=>resolve();document.head.appendChild(s);
  });
  function wire(){
    css();
    const btn=document.getElementById('mapBtn');
    if(btn&&!btn.dataset.vtgMapFix){btn.dataset.vtgMapFix='1';btn.addEventListener('click',async()=>{setTimeout(async()=>{try{await ensureEnhancer();if(typeof window.VTGInitMap==='function')window.VTGInitMap()}catch(e){console.warn('VTG map init',e)}},120)},{capture:true})}
    const drawer=document.getElementById('mapDrawer');
    if(drawer&&!drawer.dataset.vtgMapFix){drawer.dataset.vtgMapFix='1';new MutationObserver(()=>{if(drawer.classList.contains('open')){css();setTimeout(async()=>{try{await ensureEnhancer();if(typeof window.VTGInitMap==='function')window.VTGInitMap()}catch(e){console.warn('VTG map observer',e)}},80)}}).observe(drawer,{attributes:true,attributeFilter:['class']})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
