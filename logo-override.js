(()=>{
  const apply=()=>{
    document.querySelectorAll('.brand').forEach(brand=>{
      brand.querySelectorAll('.brandLogo,.brandFallback,.brandText').forEach(el=>el.style.display='none');
      let img=brand.querySelector('img[data-vtg-blue-logo]');
      if(!img){
        img=document.createElement('img');
        img.src='/assets/vtg-logo-blue.svg?v=2';
        img.alt='Vintage Trade Global — Africa • China • World';
        img.setAttribute('data-vtg-blue-logo','true');
        img.style.cssText='width:255px;height:66px;object-fit:contain;object-position:left center;display:block;';
        brand.prepend(img);
      }
    });
  };
  const start=()=>{apply();setTimeout(apply,300);setTimeout(apply,1200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
