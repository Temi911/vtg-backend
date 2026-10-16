/* VTG workspace Atlas: real Leaflet map, real coordinates, public tile providers. */
(() => {
  'use strict';
  const DATA_URL='/vtg-trade-atlas.js?v=20261016-live-leaflet';
  const css=`
    #mapDrawer .drawerPanel{width:min(1120px,96vw)!important;height:min(94vh,900px)!important;top:3vh!important;border-radius:18px 0 0 18px!important;padding:16px!important;background:#f3f7f8;overflow:auto!important}
    .vtgMapApp{color:#17384b;background:#fff;border:1px solid #dbe5e9;border-radius:16px;overflow:hidden}
    .vtgMapHead{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:12px;border-bottom:1px solid #e2eaee}
    .vtgMapHead input{flex:1;min-width:190px;height:40px;border:1px solid #cedde3;border-radius:10px;padding:0 12px;font:inherit;color:#17384b;background:#fff}
    .vtgMapBtn{border:1px solid #cfdee4;background:#fff;color:#17384b;border-radius:9px;padding:9px 12px;font-weight:800;font-size:12px;cursor:pointer}
    .vtgMapBtn.primary{background:#a82028;color:#fff;border-color:#a82028}
    .vtgLeafletStage{position:relative;background:#dcebf0;min-height:420px;height:min(62vh,650px);overflow:hidden}
    #vtgLeafletMap{width:100%;height:100%;min-height:420px;background:#e8f0f4}
    .vtgMapLayerPanel{position:absolute;left:12px;top:12px;z-index:500;width:205px;background:rgba(255,255,255,.96);border:1px solid #d1e0e5;border-radius:12px;padding:10px;box-shadow:0 6px 22px #143b5017}
    .vtgMapLayerPanel strong{display:block;font-size:12px;margin:2px 4px 8px}.vtgMapLayer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 4px;font-size:11px;border-top:1px solid #edf2f4}
    .vtgMapLayer input{accent-color:#a82028}.vtgMapTools{position:absolute;right:12px;top:12px;z-index:500;display:grid;gap:6px}
    .vtgMapTools button{width:38px;height:38px;border:1px solid #d1e0e5;background:#fff;color:#17384b;border-radius:10px;font-size:17px;font-weight:800;cursor:pointer}
    .vtgMapStatus{position:absolute;left:12px;bottom:12px;z-index:500;max-width:min(520px,calc(100% - 24px));padding:9px 12px;background:#102e40ef;color:#fff;border-radius:10px;font-size:11px}
    .vtgMapLegend{display:flex;flex-wrap:wrap;gap:12px;padding:10px 12px;border-top:1px solid #e2eaee;color:#577080;font-size:11px}.vtgMapLegend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
    .vtgMapFoot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#f8fafb;font-size:11px;color:#607786}
    .vtgLeafletPopup{font:12px/1.55 Manrope,Arial,sans-serif;color:#17384b;min-width:155px}
    .vtgLeafletPopup strong{display:block;margin-bottom:3px}.vtgLeafletPopup small{color:#526b79}
    .vtgLeafletMarker{border:2px solid #fff;border-radius:50%;box-shadow:0 1px 7px #12212b99}
    @media(max-width:650px){#mapDrawer .drawerPanel{width:98vw!important;height:96vh!important;top:2vh!important;padding:10px!important;border-radius:14px!important}.vtgLeafletStage{height:64vh;min-height:390px}#vtgLeafletMap{min-height:390px}.vtgMapLayerPanel{width:164px;left:7px;top:7px;padding:7px}.vtgMapLayer{font-size:10px;padding:6px 2px}.vtgMapTools{right:7px;top:7px}.vtgMapTools button{width:34px;height:34px}.vtgMapStatus{left:7px;bottom:7px;font-size:10px}}
  `;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function ensureCss(){
    if(!document.getElementById('vtgLeafletAtlasCss')){const style=document.createElement('style');style.id='vtgLeafletAtlasCss';style.textContent=css;document.head.appendChild(style);}
  }
  function loadLeafletCss(url){
    if(document.querySelector('link[data-vtg-leaflet-css]'))return Promise.resolve();
    return new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=url;link.dataset.vtgLeafletCss='1';link.onload=()=>resolve();link.onerror=()=>resolve();document.head.appendChild(link);});
  }
  function loadScript(url,attribute){
    if(window.L)return Promise.resolve();
    const existing=document.querySelector('script['+attribute+']');
    if(existing)return new Promise((resolve,reject)=>{if(window.L)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});});
    return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.crossOrigin='anonymous';script.setAttribute(attribute,'1');script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});
  }
  async function ensureLeaflet(){
    if(window.L)return;
    await loadLeafletCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    try{await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','data-vtg-leaflet-primary');}
    catch(_){await loadLeafletCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');await loadScript('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','data-vtg-leaflet-fallback');}
  }
  function loadData(){
    if(window.VTGTradeAtlasData)return Promise.resolve(window.VTGTradeAtlasData);
    return new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-vtg-atlas-data]');if(existing){existing.addEventListener('load',()=>window.VTGTradeAtlasData?resolve(window.VTGTradeAtlasData):reject(Error('Atlas data missing')),{once:true});existing.addEventListener('error',reject,{once:true});return;}const script=document.createElement('script');script.src=DATA_URL;script.dataset.vtgAtlasData='1';script.onload=()=>window.VTGTradeAtlasData?resolve(window.VTGTradeAtlasData):reject(Error('Atlas data missing'));script.onerror=reject;document.head.appendChild(script);});
  }
  async function open(){
    const drawer=document.getElementById('mapDrawer');if(!drawer)return;
    ensureCss();
    drawer.innerHTML=`<div class="drawerPanel"><div class="drawerTop"><div><div class="eyebrow">AFRICA · CHINA · SOUTH KOREA</div><h2>VTG Trade Atlas</h2><p style="font-size:12px;color:var(--muted);margin:4px 0 12px">Live geographic map with real-world coordinates, ports, trade hubs and illustrative corridors.</p></div><button class="close" id="vtgLeafletClose" aria-label="Close map">×</button></div><div class="vtgMapApp"><div class="vtgMapHead"><input id="vtgLeafletSearch" placeholder="Search a country, port or trade hub (e.g. Tin Can Island)" aria-label="Search map locations"><button class="vtgMapBtn primary" id="vtgLeafletFind">Find location</button><button class="vtgMapBtn" id="vtgLeafletWorld">Reset view</button></div><div class="vtgLeafletStage"><div id="vtgLeafletMap" role="application" aria-label="Interactive map of ports and trade hubs"></div><div class="vtgMapLayerPanel"><strong>Map layers</strong><label class="vtgMapLayer">Countries <input type="checkbox" data-vlayer="countries" checked></label><label class="vtgMapLayer">Ports & terminals <input type="checkbox" data-vlayer="ports" checked></label><label class="vtgMapLayer">Trade hubs <input type="checkbox" data-vlayer="hubs" checked></label><label class="vtgMapLayer">Shipping corridors <input type="checkbox" data-vlayer="routes" checked></label></div><div class="vtgMapTools"><button id="vtgLeafletPlus" aria-label="Zoom in">+</button><button id="vtgLeafletMinus" aria-label="Zoom out">−</button><button id="vtgLeafletHome" aria-label="Reset map">⌂</button></div><div id="vtgLeafletStatus" class="vtgMapStatus" role="status" aria-live="polite">Loading real map tiles and trade locations…</div></div><div class="vtgMapLegend"><span><i style="background:#078c91"></i>Markets</span><span><i style="background:#e46b42"></i>Ports / terminals</span><span><i style="background:#7754cf"></i>Trade hubs</span><span><i style="background:#d5a33b"></i>Illustrative shipping corridors</span></div><div class="vtgMapFoot"><span id="vtgLeafletCounts">Map locations are loaded from VTG's trade-location dataset.</span><span>Drag to pan · scroll or use + / − to zoom · select a marker for details</span></div></div></div>`;
    drawer.classList.add('open');document.body.style.overflow='hidden';
    const close=()=>{drawer.classList.remove('open');document.body.style.overflow='';};
    document.getElementById('vtgLeafletClose').addEventListener('click',close);
    const mapNode=document.getElementById('vtgLeafletMap'),status=document.getElementById('vtgLeafletStatus');
    try{
      const results=await Promise.all([ensureLeaflet(),loadData()]);
      const D=results[1];
      if(!window.L)throw Error('Leaflet library unavailable');
      const map=L.map(mapNode,{worldCopyJump:true,zoomControl:false,scrollWheelZoom:true,minZoom:2,maxZoom:18,preferCanvas:true}).setView([17,38],2);
      const layerGroups={countries:L.layerGroup().addTo(map),ports:L.layerGroup().addTo(map),hubs:L.layerGroup().addTo(map),routes:L.layerGroup().addTo(map)};
      let loadedTiles=0,failedTiles=0,usingFallback=false;
      const watchTiles=layer=>{layer.on('tileload',()=>{loadedTiles++;status.style.display='none';});layer.on('tileerror',()=>{failedTiles++;if(!loadedTiles&&failedTiles>=4&&!usingFallback){usingFallback=true;map.removeLayer(layer);status.textContent='Primary map tiles unavailable; trying alternate map tiles…';status.style.display='block';const alt=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &middot; &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'}).addTo(map);loadedTiles=0;failedTiles=0;watchTiles(alt);}else if(!loadedTiles&&usingFallback&&failedTiles>=4){status.textContent='Both public tile services are unavailable on this connection. Check your connection and reload; no API key is required.';status.style.display='block';}});};
      const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);watchTiles(base);
      const colors={countries:'#078c91',ports:'#e46b42',hubs:'#7754cf'};
      const addPoints=(items,key,type)=>{(items||[]).forEach(p=>{if(!Number.isFinite(+p.lat)||!Number.isFinite(+p.lon))return;const marker=L.circleMarker([+p.lat,+p.lon],{radius:key==='countries'?4:key==='ports'?6:7,color:'#fff',weight:1.5,fillColor:colors[key],fillOpacity:.95});marker.bindPopup('<div class="vtgLeafletPopup"><strong>'+esc(p.name)+'</strong><small>'+esc(p.country||'Trade market')+' · '+esc(type)+'</small><p style="margin:7px 0 0;color:#526b79">Coordinates: '+(+p.lat).toFixed(4)+', '+(+p.lon).toFixed(4)+'</p></div>');marker.addTo(layerGroups[key]);marker.on('click',()=>{status.textContent=p.name+(p.country?' · '+p.country:'')+' — '+type;status.style.display='block';});});};
      addPoints(D.countries,'countries','country / market');addPoints(D.ports,'ports','port / terminal');addPoints(D.hubs,'hubs','trade hub');
      (D.routes||[]).forEach(r=>{const coords=(r.coords||[]).map(point=>[+point[1],+point[0]]).filter(point=>Number.isFinite(point[0])&&Number.isFinite(point[1]));if(coords.length<2)return;const line=L.polyline(coords,{color:'#d5a33b',weight:2.5,opacity:.82,dashArray:'7 6'});line.bindTooltip(esc(r.name),{sticky:true});line.addTo(layerGroups.routes);});
      const layerLabels={countries:'country / market',ports:'port / terminal',hubs:'trade hub'};
      document.querySelectorAll('[data-vlayer]').forEach(input=>input.addEventListener('change',()=>{const group=layerGroups[input.dataset.vlayer];if(!group)return;if(input.checked)group.addTo(map);else map.removeLayer(group);}));
      function find(){const q=document.getElementById('vtgLeafletSearch').value.trim().toLowerCase();if(!q)return;const all=[...(D.countries||[]).map(p=>({...p,_key:'countries'})),...(D.ports||[]).map(p=>({...p,_key:'ports'})),...(D.hubs||[]).map(p=>({...p,_key:'hubs'}))];const p=all.find(x=>x.name.toLowerCase()===q)||all.find(x=>x.name.toLowerCase().includes(q)||String(x.country||'').toLowerCase().includes(q));if(!p){status.textContent='No location found. Try Tin Can Island, Lagos, Shanghai, Busan or a country name.';status.style.display='block';return;}map.setView([+p.lat,+p.lon],Math.max(map.getZoom(),6),{animate:true});const layer=layerGroups[p._key];if(layer&&!map.hasLayer(layer)){layer.addTo(map);const box=document.querySelector('[data-vlayer="'+p._key+'"]');if(box)box.checked=true;}status.textContent='Found '+p.name+(p.country?' · '+p.country:'')+' — '+(layerLabels[p._key]||'location');status.style.display='block';};
      document.getElementById('vtgLeafletFind').addEventListener('click',find);document.getElementById('vtgLeafletSearch').addEventListener('keydown',e=>{if(e.key==='Enter')find();});
      document.getElementById('vtgLeafletWorld').addEventListener('click',()=>{map.setView([17,38],2,{animate:true});status.textContent='Showing the world trade overview.';status.style.display='block';});
      document.getElementById('vtgLeafletHome').addEventListener('click',()=>document.getElementById('vtgLeafletWorld').click());
      document.getElementById('vtgLeafletPlus').addEventListener('click',()=>map.zoomIn());
      document.getElementById('vtgLeafletMinus').addEventListener('click',()=>map.zoomOut());
      document.getElementById('vtgLeafletCounts').textContent=(D.countries||[]).length+' markets · '+(D.ports||[]).length+' ports · '+(D.hubs||[]).length+' hubs · '+(D.routes||[]).length+' corridors. Public map tiles; no API key required.';
      window.VTGWorkspaceAtlas={map,layerGroups,data:D,search:find};
      status.textContent='Real map ready. Search Tin Can Island, Lagos, Shanghai or Busan.';status.style.display='block';
      window.setTimeout(()=>map.invalidateSize({pan:false}),160);
      window.addEventListener('resize',()=>map.invalidateSize({pan:false}),{passive:true});
      drawer.addEventListener('transitionend',()=>map.invalidateSize({pan:false}),{once:true});
    }catch(error){console.error('VTG workspace Atlas could not start:',error);status.textContent='Map setup failed on this connection. Check your internet connection and reload; the Atlas requires a public map library and tile service.';status.style.display='block';}
  }
  window.VTGStartMapRecovery=open;
  if(document.getElementById('mapDrawer')?.classList.contains('open'))open();
})();