/* Interactive real-world map for the buyer workspace Atlas. */
(() => {
  'use strict';
  const DATA_URL='/vtg-trade-atlas.js?v=20261016-buyer-map';
  let pendingRegion=null;
  const css=`
    html[data-theme="light"] .vtgBuyerAtlasMap{background:#eaf0f4!important;color:#17384b!important}
    html[data-theme="light"] .vtgBuyerAtlasMap .leaflet-tile{filter:none!important}
    html[data-theme="dark"] .vtgBuyerAtlasMap{background:#0b1117!important;color:#edf3f7!important}
    html[data-theme="dark"] .vtgBuyerAtlasMap .leaflet-tile{filter:brightness(.72) invert(1) contrast(.86) hue-rotate(180deg) saturate(.72)!important}

    .vtgBuyerAtlasMap{width:100%;height:100%;min-height:320px;background:#eaf0f4}
    .vtgBuyerAtlasMap .leaflet-container{width:100%;height:100%;min-height:320px;font:12px Manrope,Arial,sans-serif}
    .vtgBuyerAtlasPopup{min-width:145px;color:#1d3441;font:12px/1.5 Manrope,Arial,sans-serif}
    .vtgBuyerAtlasPopup strong{display:block;margin-bottom:3px}.vtgBuyerAtlasPopup small{color:#536b79}
    @media(max-width:600px){.mapWrap{height:360px!important}.vtgBuyerAtlasMap,.vtgBuyerAtlasMap .leaflet-container{min-height:300px}}
  `;
  function ensureCss(){if(document.getElementById('vtgBuyerAtlasCss'))return;const s=document.createElement('style');s.id='vtgBuyerAtlasCss';s.textContent=css;document.head.appendChild(s);}
  function loadCss(url){
    const existing=[...document.querySelectorAll('link[data-vtg-buyer-leaflet-css]')].find(x=>x.href===url);
    if(existing){if(existing.dataset.state==='loaded')return Promise.resolve();if(existing.dataset.state==='failed')return Promise.reject(Error('Leaflet CSS failed'));return new Promise((r,j)=>{existing.addEventListener('load',r,{once:true});existing.addEventListener('error',()=>j(Error('Leaflet CSS failed')),{once:true});});}
    return new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=url;l.dataset.vtgBuyerLeafletCss='1';l.onload=()=>{l.dataset.state='loaded';resolve();};l.onerror=()=>{l.dataset.state='failed';reject(Error('Leaflet CSS failed'));};document.head.appendChild(l);});
  }
  function loadJs(url,attr){
    if(window.L)return Promise.resolve();
    const old=document.querySelector('script['+attr+']');
    if(old){if(old.dataset.state==='loaded'||window.L)return Promise.resolve();if(old.dataset.state==='failed')return Promise.reject(Error('Leaflet JS failed'));return new Promise((r,j)=>{old.addEventListener('load',r,{once:true});old.addEventListener('error',()=>j(Error('Leaflet JS failed')),{once:true});});}
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.crossOrigin='anonymous';s.setAttribute(attr,'1');s.onload=()=>{s.dataset.state='loaded';resolve();};s.onerror=()=>{s.dataset.state='failed';reject(Error('Leaflet JS failed'));};document.head.appendChild(s);});
  }
  async function leaflet(){
    if(window.L)return;
    try{await loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');await loadJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','data-vtg-buyer-leaflet-primary');}
    catch(_){await loadCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');await loadJs('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','data-vtg-buyer-leaflet-fallback');}
  }
  function data(){
    if(window.VTGTradeAtlasData)return Promise.resolve(window.VTGTradeAtlasData);
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=DATA_URL;s.onload=()=>window.VTGTradeAtlasData?resolve(window.VTGTradeAtlasData):reject(Error('Atlas data unavailable'));s.onerror=reject;document.head.appendChild(s);});
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function init(){
    const node=document.getElementById('map');if(!node||node.dataset.vtgMapInit)return;
    node.dataset.vtgMapInit='loading';ensureCss();
    Promise.all([leaflet(),data()]).then(([,D])=>{
      if(!window.L)throw Error('Leaflet unavailable');
      const map=L.map(node,{zoomControl:true,scrollWheelZoom:true,worldCopyJump:true,minZoom:2,maxZoom:18}).setView([17,38],2);
      const groups={countries:L.layerGroup().addTo(map),ports:L.layerGroup().addTo(map),hubs:L.layerGroup().addTo(map),routes:L.layerGroup().addTo(map)};
      const mapStatus=document.createElement('div');
      mapStatus.setAttribute('role','status');mapStatus.setAttribute('aria-live','polite');
      mapStatus.style.cssText='position:absolute;z-index:500;left:12px;bottom:12px;max-width:calc(100% - 24px);padding:8px 11px;border-radius:9px;background:#102e40ed;color:#fff;font:600 11px Manrope,Arial,sans-serif;display:none;pointer-events:none';
      node.style.position='relative';node.appendChild(mapStatus);
      let loaded=0,failed=0;
      const watch=layer=>{
        layer.on('tileload',()=>{loaded++;node.dataset.mapTiles='loaded';mapStatus.style.display='none';});
        layer.on('tileerror',()=>{
          failed++;
          if(!loaded&&failed>=4){
            node.dataset.mapTiles='unavailable';
            mapStatus.innerHTML='Map tiles are unavailable on this connection. <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline">Open OpenStreetMap</a> or reload to retry.';
            mapStatus.style.display='block';
          }
        });
      };
      const base=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
      watch(base);
      const colors={countries:'#078c91',ports:'#e46b42',hubs:'#7754cf'};
      [['countries','country'],['ports','port / terminal'],['hubs','trade hub']].forEach(([key,label])=>(D[key]||[]).forEach(p=>{
        if(!Number.isFinite(+p.lat)||!Number.isFinite(+p.lon))return;
        const marker=L.circleMarker([+p.lat,+p.lon],{radius:key==='countries'?2.5:key==='ports'?4:key==='hubs'?4.5:4,color:'#fff',weight:1.5,fillColor:colors[key],fillOpacity:.96});
        marker.bindPopup('<div class="vtgBuyerAtlasPopup"><strong>'+esc(p.name)+'</strong><small>'+esc(p.country||'Trade market')+' · '+label+'</small><p style="margin:6px 0 0">Coordinates: '+(+p.lat).toFixed(4)+', '+(+p.lon).toFixed(4)+'</p></div>').addTo(groups[key]);
      }));
      /* Public sample corridors intentionally omitted here: private dashboard route lines are rendered by vtg-shipment-globe.js from matching order records only. */
      function setRegion(region){
        const views={africa:{center:[4,18],zoom:3},china:{center:[31,105],zoom:4},korea:{center:[36.2,127.8],zoom:6},world:{center:[17,38],zoom:2}};
        const v=views[region]||views.world;map.setView(v.center,v.zoom,{animate:true});
      }
      window.VTGBuyerAtlas={map,groups,data:D,setRegion};
      node.dataset.vtgMapInit='ready';
      if(pendingRegion)setRegion(pendingRegion);
      const refresh=()=>map.invalidateSize({pan:false});
      window.addEventListener('resize',refresh,{passive:true});
      document.querySelectorAll('[data-view="atlas"]').forEach(el=>el.addEventListener('click',()=>window.setTimeout(refresh,180)));
      window.setTimeout(refresh,160);
    }).catch(error=>{
      console.error('VTG buyer Atlas failed to initialize:',error);
      node.dataset.vtgMapInit='failed';
      node.innerHTML='<div style="min-height:320px;display:grid;place-items:center;padding:24px;text-align:center;background:#eef4f6;color:#233746"><div><strong>Interactive map could not load on this connection.</strong><p>Check your internet connection and reopen the Atlas. This map uses public OpenStreetMap tiles and does not require a paid API key.</p><a href="https://www.openstreetmap.org/" target="_blank" rel="noopener">Open OpenStreetMap</a></div></div>';
    });
  }
  window.addEventListener('vtg:buyer-map-region',event=>{const region=event.detail?.region;if(window.VTGBuyerAtlas?.setRegion)window.VTGBuyerAtlas.setRegion(region);else pendingRegion=region;});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
