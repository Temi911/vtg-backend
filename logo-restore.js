(()=>{
  const restore=async(doc)=>{
    try{
      const target=doc.getElementById('brandLogo');
      const fallback=doc.getElementById('brandFallback');
      if(!target)return;
      const html=await fetch('/index.html',{cache:'no-store'}).then(r=>r.text());
      const parsed=new DOMParser().parseFromString(html,'text/html');
      const candidates=[
        ...parsed.querySelectorAll('img[alt*="logo" i],img[id*="logo" i],img[class*="logo" i],img[src*="logo" i],img[src*="vtg" i],img[src*="vintage" i]'),
        ...parsed.querySelectorAll('#ldr img,img.ldr-logo'),
        ...parsed.querySelectorAll('link[rel*="icon" i]')
      ];
      const candidate=candidates.find(el=>el.getAttribute('src')||el.getAttribute('href'));
      if(!candidate)return;
      const src=candidate.getAttribute('src')||candidate.getAttribute('href');
      if(!src)return;
      target.src=new URL(src,location.href).href;
      target.hidden=false;
      if(fallback)fallback.hidden=true;
      target.style.display='block';
      target.style.objectFit='contain';
      target.setAttribute('data-vtg-original-logo','true');
    }catch(e){
      console.warn('VTG original logo restoration failed',e);
    }
  };
  const wait=()=>{const f=document.querySelector('#vtgFrame');if(!f)return setTimeout(wait,100);const go=()=>{try{restore(f.contentDocument)}catch(e){}};f.addEventListener('load',go,{once:true});try{if(f.contentDocument?.readyState==='complete')go()}catch(e){}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
})();
