(() => {
  if (window.__VTG_MARKETPLACE_UI__) return;
  window.__VTG_MARKETPLACE_UI__ = true;

  const css = `
  #vtg-mp-dock{position:fixed;right:18px;bottom:18px;z-index:9500;display:flex;gap:9px;align-items:center;flex-wrap:wrap;max-width:360px;justify-content:flex-end}
  .vtg-mp-btn{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(8,42,71,.94);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.2);display:grid;place-items:center;font-size:21px;transition:.2s;backdrop-filter:blur(10px)}
  .vtg-mp-btn:hover{transform:translateY(-2px);background:#1094A0}.vtg-mp-label{position:absolute;bottom:55px;right:0;background:#082A47;color:#fff;padding:6px 9px;border-radius:8px;font-size:11px;white-space:nowrap;opacity:0;pointer-events:none;transition:.15s}.vtg-mp-wrap{position:relative}.vtg-mp-wrap:hover .vtg-mp-label{opacity:1}
  #vtg-mp-panel{position:fixed;right:18px;bottom:78px;width:min(520px,calc(100vw - 28px));height:min(690px,calc(100vh - 110px));z-index:9499;background:rgba(247,251,253,.98);border:1px solid rgba(8,42,71,.14);border-radius:22px;box-shadow:0 22px 70px rgba(0,0,0,.28);display:none;overflow:hidden;color:#0E2233}
  #vtg-mp-panel.open{display:flex;flex-direction:column;animation:vtgMpIn .25s cubic-bezier(.16,1,.3,1)}@keyframes vtgMpIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
  .vtg-mp-head{padding:16px 18px;background:linear-gradient(135deg,#082A47,#1976C4);color:#fff;display:flex;align-items:center;justify-content:space-between}.vtg-mp-head strong{font-size:16px}.vtg-mp-head small{display:block;opacity:.72;margin-top:3px}.vtg-mp-close{border:0;background:rgba(255,255,255,.12);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px}
  .vtg-mp-tabs{display:flex;gap:5px;padding:10px;background:#edf5fa;border-bottom:1px solid #d8e7f1;overflow:auto}.vtg-mp-tab{border:0;background:#fff;color:#2c4e64;padding:8px 11px;border-radius:999px;font-size:12px;white-space:nowrap}.vtg-mp-tab.active{background:#1094A0;color:#fff}
  .vtg-mp-body{padding:14px;overflow:auto;flex:1}.vtg-mp-card{background:#fff;border:1px solid #dbe8f0;border-radius:16px;padding:13px;margin-bottom:10px}.vtg-mp-card h4{margin-bottom:5px}.vtg-mp-muted{font-size:12px;color:#557086}.vtg-mp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.vtg-mp-input{width:100%;border:1px solid #cbdde9;border-radius:10px;padding:10px;font:inherit;background:#fff}.vtg-mp-primary{border:0;background:#1976C4;color:#fff;border-radius:10px;padding:10px 13px;font-weight:600}.vtg-mp-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.vtg-mp-media{width:100%;height:150px;object-fit:cover;border-radius:12px;background:#dfeaf1}.vtg-mp-feed-post{border-bottom:1px solid #e2ebf1;padding:12px 0}.vtg-mp-feed-post:last-child{border-bottom:0}.vtg-mp-badge{display:inline-flex;padding:3px 7px;border-radius:999px;background:#e8f7f6;color:#0c777e;font-size:10px;font-weight:700}.vtg-mp-empty{text-align:center;padding:35px 15px;color:#60798a}.vtg-mp-call{background:#082A47;color:#fff;border-radius:16px;padding:18px}.vtg-mp-call button{margin-top:10px}.vtg-mp-bg{position:fixed;inset:0;z-index:-2;background-size:cover;background-position:center;opacity:.06;transition:background-image 1s ease,opacity .5s}
  @media(max-width:600px){#vtg-mp-panel{right:10px;bottom:72px;width:calc(100vw - 20px);height:calc(100vh - 92px)}#vtg-mp-dock{right:10px;bottom:10px}.vtg-mp-grid{grid-template-columns:1fr}}
  `;
  const style = document.createElement('style'); style.id='vtg-marketplace-ui-css'; style.textContent=css; document.head.appendChild(style);

  const root = document.createElement('div');
  root.innerHTML = `
    <div id="vtg-mp-bg" class="vtg-mp-bg" aria-hidden="true"></div>
    <div id="vtg-mp-panel" aria-hidden="true">
      <div class="vtg-mp-head"><div><strong id="vtg-mp-title">VTG Marketplace</strong><small id="vtg-mp-subtitle">Trade, discover, connect.</small></div><button class="vtg-mp-close" id="vtg-mp-close" aria-label="Close">×</button></div>
      <div class="vtg-mp-tabs">
        <button class="vtg-mp-tab active" data-mp-tab="shop">Shop</button><button class="vtg-mp-tab" data-mp-tab="feed">Trade Feed</button><button class="vtg-mp-tab" data-mp-tab="messages">Chat</button><button class="vtg-mp-tab" data-mp-tab="calls">Video</button><button class="vtg-mp-tab" data-mp-tab="support">Support</button>
      </div>
      <div class="vtg-mp-body" id="vtg-mp-body"></div>
    </div>
    <div id="vtg-mp-dock">
      <div class="vtg-mp-wrap"><span class="vtg-mp-label">VTG News</span><button class="vtg-mp-btn" data-open="feed" aria-label="Open VTG News">📰</button></div>
      <div class="vtg-mp-wrap"><span class="vtg-mp-label">VTG AI</span><button class="vtg-mp-btn" id="vtg-mp-ai" aria-label="Open VTG AI">🤖</button></div>
      <div class="vtg-mp-wrap"><span class="vtg-mp-label">World Atlas</span><button class="vtg-mp-btn" data-open="atlas" aria-label="Open World Atlas">🌍</button></div>
      <div class="vtg-mp-wrap"><span class="vtg-mp-label">Marketplace</span><button class="vtg-mp-btn" data-open="shop" aria-label="Open Marketplace">🛍️</button></div>
    </div>`;
  document.body.appendChild(root);

  const panel=document.getElementById('vtg-mp-panel'); const body=document.getElementById('vtg-mp-body');
  const tabs=[...document.querySelectorAll('.vtg-mp-tab')];
  let active='shop';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const api=async(url,opt)=>{const r=await fetch(url,{headers:{'Content-Type':'application/json',...(opt?.headers||{})},...opt});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error?.message||data?.error||'Request failed');return data};

  function open(tab='shop'){active=tab;panel.classList.add('open');panel.setAttribute('aria-hidden','false');tabs.forEach(t=>t.classList.toggle('active',t.dataset.mpTab===tab));render(tab)}
  function close(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true')}
  document.getElementById('vtg-mp-close').onclick=close;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));
  tabs.forEach(t=>t.onclick=()=>open(t.dataset.mpTab));

  async function render(tab){
    if(tab==='shop') return renderShop();
    if(tab==='feed') return renderFeed();
    if(tab==='messages') return renderMessages();
    if(tab==='calls') return renderCalls();
    if(tab==='support') return renderSupport();
    if(tab==='atlas') return renderAtlas();
  }

  function renderShop(){
    body.innerHTML=`<div class="vtg-mp-card"><h3>Find what you want to buy</h3><p class="vtg-mp-muted">Search VTG supplier catalogues by product, country or company.</p><div class="vtg-mp-row" style="margin-top:10px"><input id="vtg-mp-product-search" class="vtg-mp-input" placeholder="e.g. tricycles, Toyota parts, solar panels"/><button id="vtg-mp-search" class="vtg-mp-primary">Search</button></div></div><div id="vtg-mp-products" class="vtg-mp-empty">Search the marketplace to discover supplier products.</div>`;
    document.getElementById('vtg-mp-search').onclick=async()=>{const q=document.getElementById('vtg-mp-product-search').value.trim();const target=document.getElementById('vtg-mp-products');if(!q){target.textContent='Enter a product or company.';return}target.innerHTML='<div class="vtg-mp-empty">Searching verified catalogues…</div>';try{const d=await api('/api/products?category='+encodeURIComponent(q));const items=d.products||[];target.innerHTML=items.length?items.map(p=>`<div class="vtg-mp-card"><span class="vtg-mp-badge">${p.verified_supplier?'VTG Verified':'Supplier'}</span><h4>${esc(p.name)}</h4><p class="vtg-mp-muted">${esc(p.supplier_name||'Supplier')} · ${esc(p.category||'Trade product')}</p><strong>$${Number(p.unit_price_usd||0).toLocaleString()}</strong><p class="vtg-mp-muted">${esc(p.description||'')}</p><div class="vtg-mp-row"><button class="vtg-mp-primary" data-enquire="${p.id}">Enquire</button><button class="vtg-mp-primary" data-chat="${p.supplier_id}">Chat</button></div></div>`).join(''):'<div class="vtg-mp-empty">No products matched yet. Suppliers can publish their catalogues here.</div>'}catch(e){target.innerHTML='<div class="vtg-mp-empty">Marketplace search is temporarily unavailable.</div>'}};
  }

  async function renderFeed(){
    body.innerHTML='<div class="vtg-mp-card"><h3>VTG Trade Feed</h3><p class="vtg-mp-muted">Products, company updates, trade tips, adverts and market conversations.</p></div><div id="vtg-mp-feed" class="vtg-mp-empty">Loading feed…</div>';
    try{const d=await api('/api/marketplace/feed');const posts=d.posts||[];document.getElementById('vtg-mp-feed').innerHTML=posts.length?posts.map(p=>`<article class="vtg-mp-feed-post"><span class="vtg-mp-badge">${esc(p.post_type)}</span><h4>${esc(p.storefront_name||p.full_name||'VTG member')}</h4><p>${esc(p.body||'')}</p><p class="vtg-mp-muted">${esc(p.country_code||'Global')} · ${new Date(p.created_at).toLocaleString()}</p><div class="vtg-mp-row"><button class="vtg-mp-primary" data-like="${p.id}">Like · ${p.reaction_count||0}</button><button class="vtg-mp-primary" data-comment="${p.id}">Comment · ${p.comment_count||0}</button></div></article>`).join(''):'<div class="vtg-mp-empty">The trade feed is ready for the first verified posts.</div>'}catch(e){document.getElementById('vtg-mp-feed').textContent='Feed unavailable right now.'}
  }

  async function renderMessages(){
    body.innerHTML='<div class="vtg-mp-card"><h3>Live Trade Chat</h3><p class="vtg-mp-muted">Buyer ↔ Supplier ↔ Bank conversations, enquiry context and deal coordination.</p></div><div id="vtg-mp-msgs" class="vtg-mp-empty">Sign in to see your conversations.</div>';
    const token=localStorage.getItem('vtg_access_token')||localStorage.getItem('accessToken'); if(!token)return;
    try{const d=await api('/api/messages',{headers:{Authorization:'Bearer '+token}});document.getElementById('vtg-mp-msgs').innerHTML=(d.conversations||[]).map(c=>`<div class="vtg-mp-card"><strong>Conversation</strong><p>${esc(c.last_message||'No messages yet')}</p><span class="vtg-mp-muted">Unread: ${c.unread_count||0}</span></div>`).join('')||'<div class="vtg-mp-empty">No conversations yet.</div>'}catch(e){document.getElementById('vtg-mp-msgs').textContent='Please sign in to use live chat.'}
  }

  function renderCalls(){body.innerHTML='<div class="vtg-mp-call"><h3>Live Deal Room</h3><p>Start a secure video meeting with your buyer, supplier or bank. Calls are linked to an enquiry or conversation.</p><button class="vtg-mp-primary" id="vtg-start-call">Start video call</button></div><div class="vtg-mp-card"><strong>Supported meeting</strong><p class="vtg-mp-muted">Buyer + Supplier + Bank · screen sharing · in-call coordination.</p></div>';document.getElementById('vtg-start-call').onclick=()=>alert('VTG video room will open after the participants and enquiry are authorized.')}
  function renderSupport(){body.innerHTML='<div class="vtg-mp-card"><h3>Contact VTG</h3><p class="vtg-mp-muted">Ask a question, contact us or log a complaint.</p><div class="vtg-mp-grid"><button class="vtg-mp-primary" data-ticket="general_enquiry">General enquiry</button><button class="vtg-mp-primary" data-ticket="complaint">Log complaint</button><button class="vtg-mp-primary" data-ticket="shipping">Shipping help</button><button class="vtg-mp-primary" data-ticket="customs">Customs help</button></div></div><div class="vtg-mp-card"><h4>Need urgent help?</h4><p class="vtg-mp-muted">Use the Contact/Call Us option in the VTG navigation for direct company support.</p></div>'}
  function renderAtlas(){body.innerHTML='<div class="vtg-mp-card"><h3>🌍 VTG World Atlas</h3><p class="vtg-mp-muted">Find suppliers, companies, banks, ports and trade locations.</p><input id="vtg-atlas-q" class="vtg-mp-input" placeholder="Search Guangzhou, Lagos Port, a company or city" style="margin-top:10px"/><button id="vtg-atlas-search" class="vtg-mp-primary" style="margin-top:8px">Find location</button><div id="vtg-atlas-results" class="vtg-mp-empty">Enter a location to begin.</div></div>';document.getElementById('vtg-atlas-search').onclick=async()=>{const q=document.getElementById('vtg-atlas-q').value.trim();if(!q)return;const d=await api('/api/market/geocode?q='+encodeURIComponent(q));document.getElementById('vtg-atlas-results').innerHTML=(d.results||[]).map(x=>`<div class="vtg-mp-card"><strong>${esc(x.name)}</strong><p class="vtg-mp-muted">${x.lat.toFixed(5)}, ${x.lon.toFixed(5)}</p><a href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=12/${x.lat}/${x.lon}" target="_blank" rel="noopener">Open map →</a></div>`).join('')||'No location found.'}}

  const bgByCountry={NG:['https://images.unsplash.com/photo-1524498250077-390f9e378fc0?auto=format&fit=crop&w=1800&q=80','https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1800&q=80'],CN:['https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=1800&q=80','https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1800&q=80'],GH:['https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1800&q=80'],KE:['https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1800&q=80'],AE:['https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1800&q=80']};
  let bgIndex=0; function rotateBackground(){const country=(document.documentElement.lang||'en')&&((localStorage.getItem('vtg_country')||'NG').toUpperCase());const arr=bgByCountry[country]||bgByCountry.NG;bgIndex=(bgIndex+1)%arr.length;const bg=document.getElementById('vtg-mp-bg');if(bg)bg.style.backgroundImage=`url("${arr[bgIndex]}")`}
  setTimeout(rotateBackground,1200); setInterval(rotateBackground,12000);

  // Never auto-open News, AI or Atlas on landing. The existing VTG AI launcher remains responsible for AI itself.
  document.addEventListener('DOMContentLoaded',()=>{close();const ai=document.getElementById('vtg-mp-ai');if(ai)ai.onclick=()=>{if(typeof window.openPublicAssistant==='function')window.openPublicAssistant();else if(window.AIChat?.open)window.AIChat.open();else open('messages')};});
})();
