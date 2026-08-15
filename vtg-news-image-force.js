(()=>{
  const proxy=u=>u?'/api/market/news-image?url='+encodeURIComponent(u):'';
  const ai=(title,source)=>'/api/market/news-ai-image?title='+encodeURIComponent(title||'Trade news')+'&source='+encodeURIComponent(source||'VTG Trade Feed');
  const css=()=>{if(document.getElementById('vtgNewsForceCss'))return;const s=document.createElement('style');s.id='vtgNewsForceCss';s.textContent='.newsLarge article{display:grid!important;grid-template-columns:180px 1fr!important}.vtgNewsForceImg{width:180px!important;height:120px!important;object-fit:cover!important;background:#eaf2f4}.vtgNewsForceLabel{display:block!important;margin-top:5px!important;font-size:7px!important;color:#718792!important;text-transform:uppercase!important;letter-spacing:.05em}@media(max-width:600px){.newsLarge article{grid-template-columns:110px 1fr!important}.vtgNewsForceImg{width:110px!important;height:100%!important}}';document.head.appendChild(s)};
  async function resolve(item,img,label){
    if(item.image){img.src=item.image;label.textContent='Publisher image';return}
    if(item.link){img.src=proxy(item.link);const ok=await new Promise(r=>{let done=false;const finish=v=>{if(done)return;done=true;r(v)};img.addEventListener('load',()=>finish(true),{once:true});img.addEventListener('error',()=>finish(false),{once:true});setTimeout(()=>finish(false),5000)});if(ok&&img.naturalWidth>0){label.textContent='Publisher article image';return}}
    img.src=ai(item.title,item.source);label.textContent='AI illustration • generated from the current headline';
  }
  async function run(){
    css();
    try{const r=await fetch('/api/market/dashboard',{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)return;const d=await r.json(),items=Array.isArray(d.news)?d.news:[];if(!items.length)return;
      document.querySelectorAll('.newsLarge article').forEach((article,i)=>{const item=items[i];if(!item)return;let img=article.querySelector('.vtgNewsForceImg');if(!img){img=document.createElement('img');img.className='vtgNewsForceImg';img.alt='Relevant trade news illustration';article.prepend(img)}let label=article.querySelector('.vtgNewsForceLabel');if(!label){label=document.createElement('span');label.className='vtgNewsForceLabel';const body=article.querySelector('div');(body||article).appendChild(label)}resolve(item,img,label)});
      document.querySelectorAll('.newsPreview .newsItem').forEach((row,i)=>{const item=items[i];if(!item)return;let img=row.querySelector('img');if(!img){img=document.createElement('img');row.prepend(img)}img.alt='Relevant trade news image';resolve(item,img,{set textContent(v){}})});
    }catch(e){console.warn('VTG news image resolver',e)}
  }
  window.VTGResolveNewsImages=run;setTimeout(run,1200);setInterval(run,300000);
})();
