(function(){
  'use strict';

  const STORAGE_KEY = 'vtg_trade_journey_v1';
  const stages = [
    {id:'discover',label:'Discover',short:'Find',desc:'Find products and suppliers for the trade request.',action:'Open Marketplace',href:'/marketplace'},
    {id:'evaluate',label:'Evaluate',short:'Cost',desc:'Review product, destination, freight and landed-cost assumptions.',action:'Open Trade Intelligence',tab:'intelligence'},
    {id:'verify',label:'Verify',short:'Trust',desc:'Confirm supplier and business verification signals before commitment.',action:'Open Verification',href:'/verification.html'},
    {id:'inspect',label:'Inspect',short:'Inspect',desc:'Request product inspection where the transaction requires it.',action:'Request Inspection',href:'/product-verification.html'},
    {id:'quote',label:'Quote',short:'Quote',desc:'Record commercial terms, Incoterms, quantities and delivery assumptions.',action:'Open Trade Room',tab:'trade-room'},
    {id:'order',label:'Order',short:'Order',desc:'Turn agreed commercial terms into an order record.',action:'Open Trade Room',tab:'trade-room'},
    {id:'finance',label:'Finance',short:'Pay',desc:'Coordinate an approved payment or trade-finance workflow.',action:'Open Payments & Finance',tab:'finance'},
    {id:'ship',label:'Ship',short:'Ship',desc:'Connect shipment milestones from origin through destination.',action:'Open Trade Atlas',tab:'network'},
    {id:'customs',label:'Customs',short:'Clear',desc:'Prepare and track destination customs and compliance tasks.',action:'Open Documents',tab:'documents'},
    {id:'deliver',label:'Deliver',short:'Done',desc:'Confirm arrival, clearance completion and delivery evidence.',action:'Open Trade Room',tab:'trade-room'}
  ];

  function safeJSON(v){
    try { return JSON.parse(v); } catch(e) { return null; }
  }

  function getCountry(){
    const raw = localStorage.getItem('vtg-country');
    if(raw) return raw;
    try {
      const c = typeof window.VTG_GET_CONTEXT === 'function' ? window.VTG_GET_CONTEXT() : null;
      return c && (c.countryName || c.country) || 'Nigeria';
    } catch(e){ return 'Nigeria'; }
  }

  function getState(){
    const saved = safeJSON(localStorage.getItem(STORAGE_KEY));
    if(saved && Number.isInteger(saved.current) && saved.current >= 0 && saved.current < stages.length){
      return saved;
    }
    return {current:0,completed:[],updatedAt:new Date().toISOString()};
  }

  function saveState(state){
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function esc(v){
    return String(v).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function runAction(stage){
    if(stage.tab && typeof window.showTab === 'function'){
      window.showTab(stage.tab);
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    if(stage.href) window.location.href = stage.href;
  }

  function render(){
    const host = document.getElementById('vtgTradeJourney');
    if(!host) return;
    const state = getState();
    const current = stages[state.current] || stages[0];
    const doneCount = state.completed.length;
    const progress = Math.round((doneCount / stages.length) * 100);
    const country = getCountry();

    host.innerHTML =
      '<div class="vtgJourneyHead">'+
        '<div><span class="eyebrow">VTG TRADE JOURNEY</span>'+
        '<h2>Source → Evaluate → Verify → Inspect → Quote → Order → Finance → Ship → Customs → Deliver</h2>'+
        '<p>One transaction path for your '+esc(country)+' trade workspace. The controls below track workspace progress on this device until the live transaction APIs are connected.</p></div>'+
        '<div class="vtgJourneyProgress"><b>'+progress+'%</b><span>'+doneCount+'/'+stages.length+' stages</span></div>'+
      '</div>'+
      '<div class="vtgJourneyRail">'+stages.map(function(s,i){
        const isDone = state.completed.indexOf(s.id) !== -1;
        const isCurrent = i === state.current;
        return '<button type="button" class="vtgJourneyStage '+(isDone?'done ':'')+(isCurrent?'current':'')+'" data-stage-index="'+i+'">'+
          '<span class="vtgJourneyNum">'+(isDone?'✓':String(i+1).padStart(2,'0'))+'</span>'+
          '<span><b>'+esc(s.label)+'</b><small>'+esc(s.short)+'</small></span>'+
        '</button>';
      }).join('')+'</div>'+
      '<div class="vtgJourneyBody">'+
        '<div><span class="tag">'+esc(current.label.toUpperCase())+'</span><h3>'+esc(current.desc)+'</h3><p>Next action: <strong>'+esc(current.action)+'</strong></p></div>'+
        '<div class="vtgJourneyActions">'+
          '<button type="button" class="btn primary" id="vtgJourneyAction">'+esc(current.action)+'</button>'+
          (state.completed.indexOf(current.id) === -1
            ? '<button type="button" class="btn" id="vtgJourneyComplete">Mark stage complete</button>'
            : '<button type="button" class="btn" id="vtgJourneyReopen">Reopen stage</button>')+
        '</div>'+
      '</div>'+
      '<div class="vtgJourneyMeta"><span>Current trade destination: <b>'+esc(country)+'</b></span><span>Last workspace update: <b>'+new Date(state.updatedAt).toLocaleString()+'</b></span></div>';

    host.querySelectorAll('[data-stage-index]').forEach(function(btn){
      btn.addEventListener('click',function(){
        const next = Number(btn.dataset.stageIndex);
        const s = getState();
        s.current = next;
        saveState(s);
        render();
      });
    });

    const action = document.getElementById('vtgJourneyAction');
    if(action) action.onclick = function(){ runAction(current); };

    const complete = document.getElementById('vtgJourneyComplete');
    if(complete) complete.onclick = function(){
      const s = getState();
      if(s.completed.indexOf(current.id) === -1) s.completed.push(current.id);
      if(s.current < stages.length - 1) s.current += 1;
      saveState(s);
      render();
    };

    const reopen = document.getElementById('vtgJourneyReopen');
    if(reopen) reopen.onclick = function(){
      const s = getState();
      s.completed = s.completed.filter(function(id){ return id !== current.id; });
      saveState(s);
      render();
    };
  }

  function mount(){
    if(document.getElementById('vtgTradeJourney')) return;
    const main = document.querySelector('.main');
    const top = main && main.querySelector('.top');
    if(!main || !top) return;
    const host = document.createElement('section');
    host.id = 'vtgTradeJourney';
    host.className = 'vtgTradeJourney card';
    top.insertAdjacentElement('afterend',host);
    render();
  }

  const style = document.createElement('style');
  style.textContent = `
    .vtgTradeJourney{margin:0 0 16px;padding:20px;background:linear-gradient(135deg,#fff,#f7fbfb);border:1px solid var(--line);overflow:hidden}
    .vtgJourneyHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
    .vtgJourneyHead h2{font-size:20px;line-height:1.35;margin:5px 0 7px;max-width:980px}
    .vtgJourneyHead p{margin:0;color:var(--muted);font-size:11px;line-height:1.6;max-width:900px}
    .vtgJourneyProgress{min-width:80px;text-align:right}.vtgJourneyProgress b{display:block;font-size:26px;color:var(--accent)}.vtgJourneyProgress span{font-size:10px;color:var(--muted)}
    .vtgJourneyRail{display:grid;grid-template-columns:repeat(10,minmax(74px,1fr));gap:5px;margin:18px 0 12px}
    .vtgJourneyStage{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 7px;text-align:left;cursor:pointer;min-height:58px;color:var(--ink)}
    .vtgJourneyStage:hover{border-color:var(--accent)}.vtgJourneyStage.current{border-color:var(--accent);box-shadow:0 0 0 2px rgba(192,57,43,.08)}.vtgJourneyStage.done{background:#eef8f4;border-color:#bfe2d1}
    .vtgJourneyNum{display:block;font-size:10px;font-weight:800;color:var(--accent);margin-bottom:5px}.vtgJourneyStage.done .vtgJourneyNum{color:var(--good)}
    .vtgJourneyStage b{display:block;font-size:10px}.vtgJourneyStage small{display:block;color:var(--muted);font-size:8px;margin-top:2px}
    .vtgJourneyBody{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:14px;border-radius:12px;background:#f2f7f8}
    .vtgJourneyBody h3{font-size:14px;margin:7px 0 4px}.vtgJourneyBody p{font-size:11px;color:var(--muted);margin:0}.vtgJourneyActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .vtgJourneyMeta{display:flex;justify-content:space-between;gap:12px;margin-top:9px;color:var(--muted);font-size:9px}
    @media(max-width:900px){.vtgJourneyRail{grid-template-columns:repeat(5,1fr)}.vtgJourneyHead,.vtgJourneyBody{flex-direction:column}.vtgJourneyActions{justify-content:flex-start}.vtgJourneyMeta{flex-direction:column}}
    @media(max-width:520px){.vtgJourneyRail{grid-template-columns:repeat(2,1fr)}.vtgJourneyProgress{align-self:flex-start;text-align:left}}
  `;
  document.head.appendChild(style);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();

  window.addEventListener('vtg:context',render);
  window.addEventListener('storage',function(e){ if(e.key === STORAGE_KEY || e.key === 'vtg-country') render(); });
})();