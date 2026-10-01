/* VTG interaction recovery — keeps critical landing controls responsive even if another enhancement script interferes. */
(function(){
  'use strict';

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  function openIntel(){
    const panel=document.getElementById('vtgIntelPanel');
    if(!panel) return;
    if(typeof window.VTGOpenMarketIntel === 'function'){
      window.VTGOpenMarketIntel();
      return;
    }
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    const feed=document.getElementById('vtgIntelFeed');
    if(feed && !feed.innerHTML.trim()){
      feed.innerHTML='<div class="vtgIntelItem"><b>VTG Market Intelligence</b><small>Choose a vehicle, freight/port, or FX/trade-finance view.</small></div>';
    }
  }

  function openAI(){
    const panel=document.getElementById('aiPanel');
    const input=document.getElementById('aiInput');
    if(!panel) return;
    panel.classList.add('open');
    if(input) setTimeout(()=>input.focus(),30);
  }

  function closeAuth(){
    const modal=document.getElementById('authModal');
    if(modal) modal.classList.remove('open');
    document.body.style.overflow='';
  }

  async function fallbackAuthSubmit(form){
    const data=Object.fromEntries(new FormData(form));
    const msg=document.getElementById('authMsg');
    const role=form.dataset.vtgRole || localStorage.getItem('vtg-last-role') || 'buyer';
    const mode=form.dataset.vtgMode || 'login';
    try{
      if(mode==='signup' && !data.verificationCode) throw new Error('Enter the email verification code first.');
      let endpoint='/api/auth/login';
      let payload={email:data.email,password:data.password};

      if(mode==='signup'){
        endpoint='/api/auth/signup/'+role;
        const phoneCountry=form.querySelector('select[name="phoneCountry"]');
        const code=phoneCountry?.selectedOptions?.[0]?.dataset?.code || '';
        payload={
          email:data.email,password:data.password,fullName:data.fullName,
          phone:role==='bank'?undefined:code+' '+(data.phone||''),
          phoneCountry:role==='bank'?undefined:data.phoneCountry,
          verificationCode:data.verificationCode,
          preferredLanguage:data.preferredLanguage||'en',
          marketingSubscribed:data.marketingSubscribed==='true',
          country:data.country,city:data.city
        };
        if(role==='buyer') payload.buyerType=data.buyerType;
        if(role==='supplier') Object.assign(payload,{companyName:data.companyName,registrationNo:data.registrationNo,licenseNumber:data.licenseNumber,regulator:data.regulator});
        if(role==='bank') Object.assign(payload,{bankName:data.bankName,institutionType:data.institutionType,regulator:data.regulator,licenseNumber:data.licenseNumber,swiftCode:data.swiftCode,branch:data.branch,officerTitle:data.officerTitle,workEmail:data.workEmail});
      }

      const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.message||'Request failed');

      if(d.accessToken){
        localStorage.setItem('vtg_access_token',d.accessToken);
        localStorage.setItem('vtg-auth',JSON.stringify({user:d.user,accessToken:d.accessToken,refreshToken:d.refreshToken||null}));
        localStorage.setItem('vtg-language',d.user?.preferredLanguage||data.preferredLanguage||'en');
        localStorage.setItem('vtg-country',d.user?.country||data.country||'');
      }
      if(msg){
        msg.className='formMsg ok';
        msg.textContent=mode==='login'?'Signed in successfully. Opening your VTG workspace…':'Account created successfully. Please review the VTG agreement before entering your workspace…';
      }
      setTimeout(()=>{location.href=d.agreementRequired?'/signup-agreement.html':(mode==='signup'&&(role==='supplier'||role==='bank'))?'/verification.html':'/trade-os.html'},500);
    }catch(err){
      if(msg){msg.className='formMsg';msg.textContent=err.message||'Request failed';}
    }
  }

  function bind(){
    const intel=document.getElementById('vtgIntelLaunch');
    if(intel){
      intel.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openIntel();},{capture:true});
    }

    const ai=document.getElementById('aiLaunch');
    if(ai){
      ai.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openAI();},{capture:true});
    }

    const aiClose=document.getElementById('aiClose');
    if(aiClose) aiClose.addEventListener('click',()=>document.getElementById('aiPanel')?.classList.remove('open'),{capture:true});

    const intelClose=document.getElementById('vtgIntelClose');
    if(intelClose) intelClose.addEventListener('click',()=>{const p=document.getElementById('vtgIntelPanel');p?.classList.remove('open');p?.setAttribute('aria-hidden','true')},{capture:true});

    document.querySelectorAll('[data-role][data-auth-mode]').forEach(btn=>{
      btn.addEventListener('click',e=>{
        const fn=window.VTGOpenAuth;
        if(typeof fn==='function'){
          e.preventDefault(); e.stopImmediatePropagation();
          fn(btn.dataset.role,btn.dataset.authMode||'login');
        }
      },{capture:true});
    });

    const form=document.getElementById('authForm');
    if(form && form.dataset.vtgAuthBound!=='1'){
      form.addEventListener('submit',e=>{
        if(typeof window.VTGAuthSubmit==='function') return;
        e.preventDefault();
        fallbackAuthSubmit(form);
      },{capture:true});
    }
  }

  ready(bind);
})();
