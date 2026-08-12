const fs = require('fs');
const path = require('path');

const MAP_WIDGET = String.raw`
<style id="vtg-world-atlas-style">
#vtg-world-atlas{margin:0 0 24px;background:#071a2b;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(7,26,43,.18);font-family:Arial,sans-serif}
#vtg-world-atlas .atlas-head{padding:18px 20px;color:#fff;background:linear-gradient(120deg,#0b3150,#087f8c);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
#vtg-world-atlas .atlas-title{font-size:20px;font-weight:800}.atlas-sub{font-size:12px;opacity:.8;margin-top:3px}
#vtg-world-atlas .atlas-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}.atlas-btn{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:8px 11px;cursor:pointer;font-size:12px}.atlas-btn:hover{background:rgba(255,255,255,.2)}
#vtg-world-map{height:480px;min-height:360px}.atlas-search{position:absolute;z-index:5;top:78px;left:18px;display:flex;gap:6px;max-width:calc(100% - 36px)}.atlas-search input{width:min(340px,62vw);border:0;border-radius:10px;padding:11px 13px;box-shadow:0 5px 20px rgba(0,0,0,.2);outline:none}.atlas-search button{border:0;border-radius:10px;background:#e0a93c;color:#10283b;font-weight:700;padding:0 14px;cursor:pointer}
#vtg-world-atlas .atlas-foot{padding:10px 14px;color:#c8d8e5;background:#061421;font-size:11px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.atlas-status{color:#9fe4d0}
@media(max-width:600px){#vtg-world-map{height:390px}.atlas-search{top:88px}.atlas-search input{width:58vw}}
</style>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css">
<section id="vtg-world-atlas" aria-label="VTG World Atlas">
  <div class="atlas-head"><div><div class="atlas-title">🌍 VTG World Atlas</div><div class="atlas-sub">Explore current world locations, suppliers, buyers, ports and trade hubs</div></div><div class="atlas-actions"><button class="atlas-btn" id="vtg-locate" type="button">📍 Locate me</button><button class="atlas-btn" id="vtg-globe" type="button">🌐 Globe</button><button class="atlas-btn" id="vtg-map" type="button">🗺️ Map</button></div></div>
  <div style="position:relative"><div class="atlas-search"><input id="vtg-atlas-search" placeholder="Search a city, country or trade location…" autocomplete="off"><button id="vtg-atlas-go" type="button">Search</button></div><div id="vtg-world-map"></div></div>
  <div class="atlas-foot"><span>Business locations will be shown only from VTG-verified directory records. Private home locations are never exposed.</span><span class="atlas-status" id="vtg-atlas-status">Loading world map…</span></div>
</section>
<script src="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js"></script>
<script>
(function(){
  function boot(){
    if(!window.maplibregl||!document.getElementById('vtg-world-map')) return;
    var map=new maplibregl.Map({container:'vtg-world-map',style:'https://demotiles.maplibre.org/style.json',center:[8.6753,9.0820],zoom:1.35,attributionControl:true});
    map.addControl(new maplibregl.NavigationControl({showCompass:true}), 'bottom-right');
    var status=document.getElementById('vtg-atlas-status');
    var marker=null;
    map.on('load',function(){try{map.setProjection({type:'globe'});}catch(e){} status.textContent='World atlas ready';});
    document.getElementById('vtg-globe').onclick=function(){try{map.setProjection({type:'globe'});map.easeTo({zoom:1.35,duration:700});}catch(e){}};
    document.getElementById('vtg-map').onclick=function(){try{map.setProjection({type:'mercator'});map.easeTo({zoom:2,duration:700});}catch(e){}};
    document.getElementById('vtg-locate').onclick=function(){
      if(!navigator.geolocation){status.textContent='Location is not available in this browser';return;}
      status.textContent='Requesting your location…';
      navigator.geolocation.getCurrentPosition(function(p){var lng=p.coords.longitude,lat=p.coords.latitude;if(marker)marker.remove();marker=new maplibregl.Marker({color:'#e0a93c'}).setLngLat([lng,lat]).setPopup(new maplibregl.Popup().setText('Your approximate current location')).addTo(map);map.flyTo({center:[lng,lat],zoom:9,speed:.8});status.textContent='Your location is shown privately on this map';},function(){status.textContent='Location permission was not granted';},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
    };
    function search(){var q=document.getElementById('vtg-atlas-search').value.trim();if(!q)return;status.textContent='Location search will be connected to VTG verified location data';window.dispatchEvent(new CustomEvent('vtg:atlas-search',{detail:{query:q,map:map}}));}
    document.getElementById('vtg-atlas-go').onclick=search;document.getElementById('vtg-atlas-search').addEventListener('keydown',function(e){if(e.key==='Enter')search();});
    window.vtgWorldAtlas={map:map,showLocation:function(lng,lat,label){if(marker)marker.remove();marker=new maplibregl.Marker({color:'#e0a93c'}).setLngLat([lng,lat]).setPopup(new maplibregl.Popup().setText(label||'VTG location')).addTo(map);map.flyTo({center:[lng,lat],zoom:12});}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
</script>`;

const AI_WIDGET = String.raw`
<style id="vtg-ai-widget-v2">
#ai-launcher,#ai-panel{display:none!important}#vtg-ai-launcher-v2{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border:0;border-radius:50%;background:linear-gradient(135deg,#1976C4,#1094A0);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483000;box-shadow:0 10px 28px rgba(14,34,51,.28)}#vtg-ai-launcher-v2 svg{width:32px;height:32px}#vtg-ai-launcher-v2 .dot{position:absolute;right:3px;top:3px;width:12px;height:12px;border-radius:50%;background:#E0A93C;border:2px solid #fff}
#vtg-ai-panel-v2{position:fixed;right:20px;bottom:92px;width:390px;height:560px;max-width:calc(100vw - 28px);max-height:calc(100vh - 120px);background:#F3F8FC;border:1px solid rgba(25,118,196,.2);border-radius:12px;box-shadow:0 22px 65px rgba(14,34,51,.28);overflow:hidden;z-index:2147482999;display:none;flex-direction:column;font-family:Arial,sans-serif}#vtg-ai-panel-v2.open{display:flex}.vtg-ai-head{padding:14px 16px;background:linear-gradient(120deg,#1976C4,#1B5D8F);color:#fff;display:flex;align-items:center;gap:10px}.vtg-ai-head-title{font-weight:700;font-size:15px}.vtg-ai-head-sub{font-size:11px;opacity:.78;margin-top:2px}.vtg-ai-close{margin-left:auto;border:0;background:transparent;color:#fff;font-size:24px;cursor:pointer}.vtg-ai-messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:9px;background:#EAF4FB}.vtg-ai-msg{max-width:86%;padding:9px 11px;border-radius:9px;font-size:13px;line-height:1.5;white-space:pre-wrap}.vtg-ai-msg.bot{align-self:flex-start;background:#fff;color:#0E2233;border:1px solid rgba(25,118,196,.15)}.vtg-ai-msg.user{align-self:flex-end;background:#1976C4;color:#fff}.vtg-ai-suggestions{padding:10px 12px 4px;display:flex;flex-wrap:wrap;gap:6px;background:#F3F8FC}.vtg-ai-suggestion{border:1px solid rgba(25,118,196,.22);background:#fff;color:#2C4E64;border-radius:18px;padding:6px 9px;font-size:11px;cursor:pointer}.vtg-ai-input{display:flex;gap:7px;padding:10px;border-top:1px solid rgba(25,118,196,.15);background:#fff}.vtg-ai-input input{flex:1;min-width:0;border:1px solid rgba(25,118,196,.22);border-radius:22px;padding:9px 12px;font-size:13px;outline:none}.vtg-ai-send{width:40px;height:40px;border:0;border-radius:50%;background:#1976C4;color:#fff;cursor:pointer}@media(max-width:600px){#vtg-ai-launcher-v2{right:14px;bottom:14px}#vtg-ai-panel-v2{right:10px;bottom:84px;width:calc(100vw - 20px);height:70vh}}
</style>
<button id="vtg-ai-launcher-v2" type="button" aria-label="Chat with VTG AI Assistant" title="Chat with VTG AI Assistant"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 7v5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="24" cy="5" r="2.2" fill="currentColor"/><rect x="8" y="12" width="32" height="27" rx="10" stroke="currentColor" stroke-width="2.8"/><circle cx="18" cy="25" r="2.7" fill="currentColor"/><circle cx="30" cy="25" r="2.7" fill="currentColor"/><path d="M17 32c2.2 2 4.5 3 7 3s4.8-1 7-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span class="dot"></span></button>
<section id="vtg-ai-panel-v2" aria-label="VTG AI Assistant" aria-hidden="true"><header class="vtg-ai-head"><div><div class="vtg-ai-head-title">VTG AI Assistant</div><div class="vtg-ai-head-sub">Nigeria-aware trade and logistics assistant</div></div><button class="vtg-ai-close" id="vtg-ai-close-v2" type="button">×</button></header><div class="vtg-ai-messages" id="vtg-ai-messages-v2"></div><div class="vtg-ai-suggestions" id="vtg-ai-suggestions-v2"><button class="vtg-ai-suggestion" data-q="What services does VTG provide?" type="button">VTG services</button><button class="vtg-ai-suggestion" data-q="What documents do I need to import goods into Nigeria?" type="button">Nigeria import documents</button><button class="vtg-ai-suggestion" data-q="How can I find a supplier in China?" type="button">Find a China supplier</button></div><form class="vtg-ai-input" id="vtg-ai-form-v2"><input id="vtg-ai-input-v2" maxlength="2000" autocomplete="off" placeholder="Ask VTG AI…"><button class="vtg-ai-send" type="submit">➤</button></form></section>
<script>(function(){var l=document.getElementById('vtg-ai-launcher-v2'),p=document.getElementById('vtg-ai-panel-v2'),m=document.getElementById('vtg-ai-messages-v2'),f=document.getElementById('vtg-ai-form-v2'),i=document.getElementById('vtg-ai-input-v2'),h=[];function add(r,t){var e=document.createElement('div');e.className='vtg-ai-msg '+(r==='user'?'user':'bot');e.textContent=t;m.appendChild(e);m.scrollTop=m.scrollHeight}function open(){p.classList.add('open');p.setAttribute('aria-hidden','false');i.focus()}function ask(q){q=String(q||'').trim();if(!q)return;add('user',q);h.push({role:'user',content:q});i.value='';fetch('/api/ai/public-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:h.slice(-20),country:'Nigeria'})}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error('AI request failed');return d})}).then(function(d){var a=d.reply||'I could not generate a response right now.';add('assistant',a);h.push({role:'assistant',content:a})}).catch(function(){add('assistant','I’m having trouble connecting right now. Please try again in a moment.')})}l.onclick=open;document.getElementById('vtg-ai-close-v2').onclick=function(){p.classList.remove('open');p.setAttribute('aria-hidden','true')};f.onsubmit=function(e){e.preventDefault();ask(i.value)};document.querySelectorAll('#vtg-ai-suggestions-v2 button').forEach(function(b){b.onclick=function(){open();ask(b.dataset.q)}});add('assistant','Hello! I’m VTG AI. I can help with Nigeria trade, China sourcing, logistics, customs and VTG services.')})();</script>`;

module.exports = (req, res) => {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('<body>', '<body>\n' + MAP_WIDGET);
    html = html.replace('</body>', AI_WIDGET + '\n</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('VTG frontend could not be loaded.');
  }
};
