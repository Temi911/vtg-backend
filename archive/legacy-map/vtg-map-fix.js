(()=>{
  let timer=null;
  const load=()=>{if(window.VTGStartMapRecovery)return window.VTGStartMapRecovery();if(document.querySelector('script[data-vtg-map-atlas-ui]'))return;const s=document.createElement('script');s.src='/vtg-map-atlas-ui.js?v=20260815-1';s.dataset.vtgMapAtlasUi='1';s.onload=()=>window.VTGStartMapRecovery?.();document.head.appendChild(s)};
  const resize=()=>{try{window.VTGMapInstance?.resize?.()}catch{}};
  function wire(){const btn=document.getElementById('mapBtn');if(btn&&!btn.dataset.vtgMapFix){btn.dataset.vtgMapFix='1';btn.addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(load,100)},{capture:true})}const drawer=document.getElementById('mapDrawer');if(drawer&&!drawer.dataset.vtgMapFix){drawer.dataset.vtgMapFix='1';new MutationObserver(()=>{if(drawer.classList.contains('open')){load();setTimeout(resize,400)}}).observe(drawer,{attributes:true,attributeFilter:['class']});}if(drawer?.classList.contains('open'))load();window.addEventListener('resize',resize,{passive:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
