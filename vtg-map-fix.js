(()=>{
  const CSS='https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css';
  function css(){if(!document.querySelector('link[data-vtg-maplibre-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.vtgMaplibreCss='1';document.head.appendChild(l)}}
  function wire(){
    css();
    const btn=document.getElementById('mapBtn');
    if(btn&&!btn.dataset.vtgMapFix){btn.dataset.vtgMapFix='1';btn.addEventListener('click',()=>setTimeout(()=>{try{window.VTGInitMap&&window.VTGInitMap()}catch(e){console.warn('VTG map init',e)}},120),{capture:true})}
    const drawer=document.getElementById('mapDrawer');
    if(drawer&&!drawer.dataset.vtgMapFix){drawer.dataset.vtgMapFix='1';new MutationObserver(()=>{if(drawer.classList.contains('open')){css();setTimeout(()=>{try{window.VTGInitMap&&window.VTGInitMap()}catch(e){}} ,80)}}).observe(drawer,{attributes:true,attributeFilter:['class']})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
