(() => {
  const esc = v => String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const proxy = url => url ? `/api/market/news-image?url=${encodeURIComponent(url)}` : '';
  const ai = (title, source) => `/api/market/news-ai-image?title=${encodeURIComponent(title)}&source=${encodeURIComponent(source||'VTG Trade Feed')}`;
  const style = () => { if(document.getElementById('vtgSmartNewsStyle'))return; const s=document.createElement('style');s.id='vtgSmartNewsStyle';s.textContent=`.newsLarge article{display:grid;grid-template-columns:180px 1fr;gap:0;overflow:hidden}.newsLarge article .vtgSmartNewsImg{width:180px;height:120px;object-fit:cover;background:#eaf2f4}.newsPreview .newsItem{display:grid!important;grid-template-columns:78px 1fr;gap:10px;align-items:center}.newsPreview .newsItem img{width:78px!important;height:56px!important;object-fit:cover!important;border-radius:8px;background:#eaf2f4}.vtgAiLabel{display:block;font-size:7px;color:#78909c;margin-top:3px;text-transform:uppercase;letter-spacing:.06em}@media(max-width:600px){.newsLarge article{grid-template-columns:110px 1fr}.newsLarge article .vtgSmartNewsImg{width:110px;height:100%}}`;document.head.appendChild(s); };
  const resolve = async (item, img, label) => {
    if(item.image){img.src=item.image;img.dataset.resolved='source';return;}
    if(item.link){
      const sourceUrl=proxy(item.link); img.src=sourceUrl; img.dataset.resolved='publisher';
      await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};img.addEventListener('load',finish,{once:true});img.addEventListener('error',finish,{once:true});setTimeout(finish,5000)});
      if(img.naturalWidth>0)return;
    }
    img.src=ai(item.title,item.source);img.dataset.resolved='ai';label.textContent='AI illustration • generated from current headline';
  };
  function render(items){
    if(!items?.length)return;style();
    [...document.querySelectorAll('.newsLarge article')].slice(0,8).forEach((article,i)=>{const item=items[i];if(!item)return;let img=article.querySelector('.vtgSmartNewsImg');if(!img){img=document.createElement('img');img.className='vtgSmartNewsImg';img.alt='Relevant news image';article.prepend(img)}let label=article.querySelector('.vtgAiLabel');if(!label){label=document.createElement('span');label.className='vtgAiLabel';article.querySelector('.liveNewsBody')?.appendChild(label)}resolve(item,img,label)});
    [...document.querySelectorAll('.newsPreview .newsItem')].slice(0,2).forEach((row,i)=>{const item=items[i];if(!item)return;let img=row.querySelector('img');if(!img){img=document.createElement('img');row.prepend(img)}img.alt='Relevant news image';resolve(item,img,{textContent:''})});
  }
  window.addEventListener('vtg:market-ready',e=>render(e.detail?.news||[]));
  const boot=()=>{if(window.VTGMarket?.refresh){window.VTGMarket.refresh();}else setTimeout(boot,900)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500),{once:true});else setTimeout(boot,500);
})();
