(() => {
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function fixLogo() {
    const imgs = document.querySelectorAll('img.brandLogo, img[src*="vtg-logo-red-transparent.png"]');
    imgs.forEach(img => {
      // Keep the canonical asset URL untouched. Rewriting the src after first paint
      // can make the logo flash and then disappear on some cached deployments.
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      img.onerror = () => {
        if (img.dataset.vtgLogoRetried === '1') return;
        img.dataset.vtgLogoRetried = '1';
        img.src = '/assets/vtg-logo-red-transparent.png';
      };
    });
  }

  function addStyles() {
    if (document.getElementById('vtgVisualEnhancer')) return;
    const style = document.createElement('style');
    style.id = 'vtgVisualEnhancer';
    style.textContent = `
    `;
    document.head.appendChild(style);
  }

  function loadRepairScript() {
    if (document.querySelector('script[data-vtg-ui-repair]')) return;
    const s=document.createElement('script');
    s.src='/vtg-ui-repair.js?v=5';
    s.dataset.vtgUiRepair='1';
    s.defer=true;
    document.head.appendChild(s);
  }

  function loadLiveMarket() {
    fetch('/api/market/dashboard',{cache:'no-store',headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{
      const news=Array.isArray(d.news)?d.news:[]; if(!news.length)return;
      const ticker=document.querySelector('.ticker span'); if(ticker)ticker.textContent=news.slice(0,10).map(x=>x.title).join(' • ');
      [...document.querySelectorAll('.newsItem')].slice(0,2).forEach((row,i)=>{const item=news[i];if(!item)return;const b=row.querySelector('b'),m=row.querySelector('small'),im=row.querySelector('img');if(b)b.textContent=item.title||'Current trade-market signal';if(m)m.textContent=(item.source||'VTG market feed')+' • '+new Date(item.published||Date.now()).toLocaleDateString();if(im&&item.image)im.src=item.image;});
    }).catch(()=>{});
  }

  function upgradeAI() {
    const form=document.querySelector('#aiForm'),input=document.querySelector('#aiInput'),msgs=document.querySelector('#aiMsgs');
    if(!form||!input||!msgs||form.dataset.vtgAiEnhanced)return;
    form.dataset.vtgAiEnhanced='1';
    const history=[];
    form.onsubmit=async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;const add=(role,t)=>{const d=document.createElement('div');d.className='msg '+role;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight};add('user',q);input.value='';history.push({role:'user',content:q});
      try{const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);const r=await fetch('/api/ai/public-chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:q,history:history.slice(-20),country:'Nigeria',role:localStorage.getItem('vtg_role')||'buyer',live:true,currentDate:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,page:location.href}),signal:c.signal});clearTimeout(timer);const d=await r.json();if(!r.ok)throw new Error(d.message||'AI request failed');const reply=d.reply||d.message||'I could not generate a response right now.';add('assistant',reply);history.push({role:'assistant',content:reply});}catch(err){add('assistant',err.name==='AbortError'?'The current-data request took too long. Please try again.':'I’m temporarily unable to connect to the VTG AI service. Please try again shortly.');}
    };
  }

  function apply(){
    try{addStyles();fixLogo();loadRepairScript();upgradeAI();loadLiveMarket();setInterval(loadLiveMarket,300000);setTimeout(()=>{fixLogo();},1200);if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.9}});}catch(e){console.warn('VTG visual enhancer failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();