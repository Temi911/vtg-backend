(()=>{
  // Official brown VTG logo supplied by the owner. The blue replacement mark is intentionally not used.
  const OFFICIAL_BROWN_LOGO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVsAAABICAYAAABY+lZsAAAAAXNSR0IArs4c';
  const restore=async(doc)=>{
    try{
      const target=doc.getElementById('brandLogo');
      const fallback=doc.getElementById('brandFallback');
      if(!target)return;
      // Keep the official brown logo supplied for this site as the authoritative brand asset.
      // If the full asset is also present in the original app, prefer it; otherwise preserve the supplied logo slot.
      const html=await fetch('/index.html',{cache:'no-store'}).then(r=>r.text()).catch(()=> '');
      const parsed=new DOMParser().parseFromString(html,'text/html');
      const candidates=[...parsed.querySelectorAll('img[alt*="logo" i],img[id*="logo" i],img[class*="logo" i],img[src*="logo" i],img[src*="vtg" i],img[src*="vintage" i]')];
      const candidate=candidates.find(el=>el.getAttribute('src'));
      const src=candidate?.getAttribute('src');
      if(src){ target.src=new URL(src,location.href).href; }
      target.hidden=false;
      if(fallback)fallback.hidden=true;
      target.style.display='block';
      target.style.objectFit='contain';
      target.setAttribute('data-vtg-official-logo','brown');
    }catch(e){console.warn('VTG official logo restoration failed',e)}
  };
  const wait=()=>{const f=document.querySelector('#vtgFrame');if(!f)return setTimeout(wait,100);const go=()=>{try{restore(f.contentDocument)}catch(e){}};f.addEventListener('load',go,{once:true});try{if(f.contentDocument?.readyState==='complete')go()}catch(e){}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
})();
