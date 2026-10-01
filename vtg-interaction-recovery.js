/* VTG interaction recovery — keeps critical landing controls responsive even if another enhancement script interferes. */
(function(){
  'use strict';

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  function openIntel(tab='overview'){
    let w=document.getElementById('vtgMarketWorkspace');
    if(!w){
      w=document.createElement('section'); w.id='vtgMarketWorkspace'; w.innerHTML='<div class="vtgMW"><aside class="vtgMSide"><b>VTG Market Intelligence</b><small>Explore live trade intelligence</small><nav><button data-mi="overview">Overview</button><button data-mi="vehicle">Vehicle Market</button><button data-mi="freight">Freight & Ports</button><button data-mi="fx">FX & Trade Finance</button><button data-mi="news">Trade News</button><button data-mi="landed">Landed Cost</button></nav><button data-mi-close>Back to VTG</button></aside><main class="vtgMMain"><header><div><span id="vtgMTag">Live trade intelligence</span><h1 id="vtgMTitle">VTG Market Intelligence</h1><p id="vtgMDesc">Explore the intelligence areas available to you.</p></div><button data-mi-close aria-label="Close">×</button></header><div id="vtgMContent"></div></main></div>';
      const s=document.createElement('style');s.textContent='#vtgMarketWorkspace{position:fixed;inset:0;z-index:2000;background:var(--cream);color:var(--ink);display:none}#vtgMarketWorkspace.open{display:block}.vtgMW{height:100%;display:grid;grid-template-columns:260px 1fr}.vtgMSide{background:var(--deep);color:#fff;padding:28px 20px;display:flex;flex-direction:column;gap:8px}.vtgMSide b{font-size:20px}.vtgMSide small{color:#ddd;font-size:9px}.vtgMSide nav{display:grid;gap:7px;margin-top:18px}.vtgMSide button{border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;border-radius:9px;padding:10px;text-align:left;font-size:9px}.vtgMSide button:hover{background:rgba(255,255,255,.1)}.vtgMMain{overflow:auto}.vtgMMain header{position:sticky;top:0;z-index:2;background:var(--white);border-bottom:1px solid var(--line);padding:24px 30px;display:flex;justify-content:space-between}.vtgMMain header h1{margin:5px 0;font-size:30px;color:var(--navy)}.vtgMMain header p{font-size:10px;color:var(--muted)}#vtgMContent{padding:25px 30px;max-width:1100px}.miGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.miCard{background:var(--white);border:1px solid var(--line);border-radius:15px;padding:18px}.miCard h3{font-size:15px;color:var(--navy)}.miCard p,.miSignal small{font-size:9px;color:var(--muted);line-height:1.5}.miSignal{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--soft);margin:7px 0}.miSignal b{display:block;font-size:10px}.miBtn{border:0;border-radius:8px;background:var(--navy);color:#fff;padding:8px 11px;font-size:8px;font-weight:800}.miForm{display:grid;grid-template-columns:1fr 1fr;gap:9px}.miForm label{font-size:8px;font-weight:800}.miForm input,.miForm select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--white);color:var(--ink)}@media(max-width:700px){.vtgMW{grid-template-columns:1fr}.vtgMSide{padding:15px}.vtgMSide nav{display:flex;overflow:auto}.vtgMSide nav button{white-space:nowrap}.miGrid,.miForm{grid-template-columns:1fr}.vtgMMain header,#vtgMContent{padding:17px}}';document.head.appendChild(s);document.body.appendChild(w);
      w.querySelectorAll('[data-mi-close]').forEach(x=>x.onclick=closeIntel);
      w.addEventListener('click',e=>{const b=e.target.closest('[data-mi]');if(b)renderIntel(b.dataset.mi)});
    }
    w.classList.add('open'); document.body.style.overflow='hidden'; renderIntel(tab);
  }
  function closeIntel(){const w=document.getElementById('vtgMarketWorkspace');if(w)w.classList.remove('open');document.body.style.overflow=''}
  async function renderIntel(tab){
    const w=document.getElementById('vtgMarketWorkspace'); if(!w)return;
    const meta={overview:['VTG Market Intelligence','Explore the intelligence areas available to you.'],vehicle:['Vehicle Market Watch','Vehicle activity, manufacturers, exports and sourcing signals.'],freight:['Freight & Port Watch','Shipping, ports, congestion and route signals.'],fx:['FX & Trade Finance','Currency and trade-finance context for cross-border purchasing.'],news:['Trade News','Current developments across vehicles, freight, ports, FX and supply chains.'],landed:['Landed Cost Calculator','Estimate import costs before requesting a supplier quotation.']}[tab]||[];
    document.getElementById('vtgMTitle').textContent=meta[0];document.getElementById('vtgMDesc').textContent=meta[1];
    const c=document.getElementById('vtgMContent');
    if(tab==='overview'){c.innerHTML='<div class="miGrid">'+[['vehicle','Vehicle Market Watch','car activity and sourcing signals'],['freight','Freight & Port Watch','shipping, ports and route signals'],['fx','FX & Trade Finance','currency and finance context'],['news','Trade News','cross-market developments'],['landed','Landed Cost Calculator','import cost estimate']].map(x=>'<article class="miCard"><h3>'+x[1]+'</h3><p>'+x[2]+'</p><button class="miBtn" data-mi="'+x[0]+'">Explore</button></article>').join('')+'</div>';return}
    if(tab==='landed'){c.innerHTML='<div class="miCard"><form id="miCostForm" class="miForm"><label>Product<input name="product" required></label><label>Destination<select name="country"><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option></select></label><label>Quantity<input name="quantity" type="number" min="1" value="1" required></label><label>Unit price USD<input name="unitPrice" type="number" min="0" step=".01" value="0" required></label><label>Freight USD<input name="freight" type="number" min="0" value="0"></label><label>Insurance USD<input name="insurance" type="number" min="0" value="0"></label><label>Duty %<input name="dutyRate" type="number" min="0" value="20"></label><label>VAT %<input name="vatRate" type="number" min="0" value="7.5"></label><button class="miBtn" type="submit">Calculate estimate</button><div id="miCostResult"></div></form></div>';document.getElementById('miCostForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget));const p={...x,quantity:+x.quantity,unitPrice:+x.unitPrice,freight:+x.freight,insurance:+x.insurance,dutyRate:+x.dutyRate/100,vatRate:+x.vatRate/100,otherLevies:0,portCharges:0,clearingFee:0,inlandTransport:0};const o=document.getElementById('miCostResult');o.textContent='Calculating…';try{const r=await fetch('/api/trade/landed-cost',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to calculate');o.innerHTML='<div class="miSignal"><b>'+esc(d.currency||'USD')+' '+esc(d.estimatedTotalLandedCost||'—')+'</b><small>Illustrative estimate only.</small></div>'}catch(err){o.textContent=err.message}};return}
    try{const r=await fetch('/api/market/dashboard',{cache:'no-store'});const d=await r.json();const news=Array.isArray(d.news)?d.news:[];const terms={vehicle:['vehicle','car','automotive','china','manufacturer'],freight:['freight','port','shipping','cargo','container','logistics'],fx:['fx','currency','finance','exchange','bank','trade']}[tab];const list=terms?news.filter(n=>terms.some(t=>String(n.title||'').toLowerCase().includes(t))).slice(0,10):news.slice(0,10);c.innerHTML='<div class="miCard">'+(list.length?list.map(n=>'<div class="miSignal"><b>'+esc(n.title||'Market signal')+'</b><small>'+esc(n.source||'VTG market feed')+'</small></div>').join(''):'<div class="miSignal"><b>No current signals available</b><small>VTG will display signals when the market feed is available.</small></div>')+'</div>'}catch{c.innerHTML='<div class="miCard"><b>Market feed temporarily unavailable</b><p>Please try again shortly.</p></div>'}
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
    // Keep the two floating tools in a vertical stack: VTG AI first, Market Intelligence directly below it.
    const aiLaunch=document.getElementById('aiLaunch');
    const intelTools=document.querySelector('.vtgIntelTools');
    if(aiLaunch && intelTools && aiLaunch.parentNode) aiLaunch.parentNode.insertBefore(intelTools, aiLaunch.nextSibling);
    const layoutStyle=document.createElement('style');
    layoutStyle.textContent='.aiLaunch{bottom:88px!important;z-index:980!important}.vtgIntelTools{right:19px!important;bottom:18px!important;z-index:981!important}.vtgIntelPanel{display:none!important}.aiPanel{right:19px!important;bottom:88px!important;height:min(565px,calc(100dvh - 105px))!important;max-height:calc(100dvh - 105px)!important;z-index:979!important}.aiPanel.open{display:flex!important;flex-direction:column!important}.aiMsgs{min-height:0!important;overflow-y:auto!important;flex:1 1 auto!important}.aiForm{position:sticky!important;bottom:0!important;z-index:3!important;flex:0 0 auto!important;background:#fff!important}.aiContext{flex:0 0 auto!important}@media(max-width:600px){.aiLaunch{right:12px!important;bottom:76px!important}.vtgIntelTools{right:15px!important;bottom:14px!important}.aiPanel{right:8px!important;bottom:12px!important;width:calc(100vw - 16px)!important;height:min(620px,calc(100dvh - 24px))!important;max-height:calc(100dvh - 24px)!important}.aiMsgs{padding-bottom:10px!important}body:has(#aiPanel.open) .vtgIntelTools{opacity:.18;pointer-events:none}}';
    document.head.appendChild(layoutStyle);

    const intel=document.getElementById('vtgIntelLaunch');
    if(intel){
      intel.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openIntel('overview');},{capture:true});
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
        e.preventDefault(); e.stopImmediatePropagation();
        const modal=document.getElementById('authModal');
        const role=btn.dataset.role||'buyer', mode=btn.dataset.authMode||'login';
        if(modal){ modal.classList.add('open'); document.body.style.overflow='hidden'; const f=document.getElementById('authForm'); if(f){f.dataset.vtgRole=role;f.dataset.vtgMode=mode;} }
        if(typeof fn==='function') fn(role,mode);
      },{capture:true});
    });

    // Use one capture-level safety net for auth controls so inline handlers or competing scripts cannot leave them inert.
    document.addEventListener('click',e=>{
      const close=e.target.closest('#authClose');
      if(close){e.preventDefault();e.stopImmediatePropagation();closeAuth();return;}
      const switcher=e.target.closest('#switchAuth');
      if(switcher){
        e.preventDefault();e.stopImmediatePropagation();
        const f=document.getElementById('authForm');
        const role=f?.dataset?.vtgRole || localStorage.getItem('vtg-last-role') || 'buyer';
        const current=f?.dataset?.vtgMode || 'login';
        const next=current==='login'?'signup':'login';
        const fn=window.VTGOpenAuth;
        if(typeof fn==='function') fn(role,next);
        return;
      }
    },{capture:true});

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
