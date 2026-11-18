/* Interactive real-world map for the buyer workspace Atlas. */
(() => {
  'use strict';
  const DATA_URL='/vtg-trade-atlas.js?v=20261016-buyer-map';
  let pendingRegion=null;
  const css=`
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
  function loadCore(){
    if(window.VTGMap)return Promise.resolve();
    return new Promise(function(res,rej){var s=document.createElement('script');s.src='/vtg-map-core.js?v=20261118-map-1';s.onload=function(){window.VTGMap?res():rej(Error('map core'))};s.onerror=function(){rej(Error('map core'))};document.head.appendChild(s)});
  }
  function leaflet(){return loadCore().then(function(){return window.VTGMap.ensureLeaflet()});}
  function data(){
    if(window.VTGTradeAtlasData)return Promise.resolve(window.VTGTradeAtlasData);
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=DATA_URL;s.onload=()=>window.VTGTradeAtlasData?resolve(window.VTGTradeAtlasData):reject(Error('Atlas data unavailable'));s.onerror=reject;document.head.appendChild(s);});
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function init(){
    const node=document.getElementById('map');if(!node||node.dataset.vtgMapInit)return;
    /* Workspace dashboards only show the user's own shipment routes (vtg-shipment-globe.js); the all-places atlas lives on the public Trade Atlas page. */
    if(/\/(buyer-dashboard|supplier-dashboard|bank-trade-os)/.test(location.pathname))return;
    node.dataset.vtgMapInit='loading';ensureCss();
    Promise.all([leaflet(),data()]).then(([,D])=>{
      if(!window.L)throw Error('Leaflet unavailable');
      const map=L.map(node,{zoomControl:true,scrollWheelZoom:true,worldCopyJump:true,minZoom:2,maxZoom:18}).setView([17,38],2);
      const groups={countries:L.layerGroup().addTo(map),ports:L.layerGroup().addTo(map),hubs:L.layerGroup().addTo(map),routes:L.layerGroup().addTo(map)};
      const mapStatus={style:{}};let base;
      window.VTGMap.basemap(L,map);
      const colors={countries:'#078c91',ports:'#e46b42',hubs:'#7754cf'};
      [['countries','country'],['ports','port / terminal'],['hubs','trade hub']].forEach(([key,label])=>(D[key]||[]).forEach(p=>{
        if(!Number.isFinite(+p.lat)||!Number.isFinite(+p.lon))return;
        const marker=L.circleMarker([+p.lat,+p.lon],{radius:key==='countries'?1.8:key==='ports'?2.6:key==='hubs'?2.8:2.6,color:'#fff',weight:1,fillColor:colors[key],fillOpacity:.96});
        marker.bindPopup('<div class="vtgBuyerAtlasPopup"><strong>'+esc(p.name)+'</strong><small>'+esc(p.country||'Trade market')+' · '+label+'</small><p style="margin:6px 0 0">Coordinates: '+(+p.lat).toFixed(4)+', '+(+p.lon).toFixed(4)+'</p></div>').addTo(groups[key]);
        if(key!=='countries'&&window.VTGPortGallery)marker.on('click',()=>{try{window.VTGPortGallery.open({name:p.name,lat:+p.lat,lon:+p.lon,country:p.country,type:label});}catch(_){}});
      }));
      if(window.VTGPortGallery)window.VTGPortGallery.addToLeaflet(L,map);
      /* Public sample corridors intentionally omitted here: private dashboard route lines are rendered by vtg-shipment-globe.js from matching order records only. */
      function setRegion(region){
        const views={africa:{center:[4,18],zoom:3},china:{center:[31,105],zoom:4},korea:{center:[36.2,127.8],zoom:6},world:{center:[17,38],zoom:2}};
        const v=views[region]||views.world;map.setView(v.center,v.zoom,{animate:true});
      }
      let vesselMarker=null;
      function showVesselPosition(position){
        const lat=Number(position?.latitude),lon=Number(position?.longitude);
        if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lon)||lon < -180||lon > 180)return;
        if(vesselMarker)map.removeLayer(vesselMarker);
        vesselMarker=L.circleMarker([lat,lon],{radius:9,color:'#fff',weight:2,fillColor:'#702A30',fillOpacity:1}).addTo(map);
        const stamp=position.position_time?new Date(position.position_time).toLocaleString():'timestamp unavailable';
        vesselMarker.bindPopup('<strong>Last provider-reported vessel position</strong><br>'+esc(position.provider||'AIS')+'<br>'+esc(stamp)+'<br><small>This position is not proof that a specific container is aboard.</small>');
        map.flyTo([lat,lon],Math.max(map.getZoom(),4),{animate:true,duration:0.8});
      }
      window.VTGBuyerAtlas={map,groups,data:D,setRegion,showVesselPosition};
      if(pendingVessel)showVesselPosition(pendingVessel);
      node.dataset.vtgMapInit='ready';
      if(pendingRegion)setRegion(pendingRegion);
      const refresh=()=>map.invalidateSize({pan:false});
      window.addEventListener('resize',refresh,{passive:true});
      document.querySelectorAll('[data-view="atlas"]').forEach(el=>el.addEventListener('click',()=>window.setTimeout(refresh,180)));
      window.setTimeout(refresh,160);
    }).catch(error=>{
      console.error('VTG buyer Atlas failed to initialize:',error);
      node.dataset.vtgMapInit='failed';
      node.innerHTML='<div style="min-height:320px;display:grid;place-items:center;padding:24px;text-align:center;background:#eef4f6;color:#233746"><div><strong>The map could not start.</strong><p>Please reload the page.</p></div></div>';
    });
  }
  let pendingVessel=null;
  window.addEventListener('vtg:buyer-vessel-position',event=>{const p=event.detail;if(window.VTGBuyerAtlas?.showVesselPosition)window.VTGBuyerAtlas.showVesselPosition(p);else pendingVessel=p;});
  window.addEventListener('vtg:buyer-map-region',event=>{const region=event.detail?.region;if(window.VTGBuyerAtlas?.setRegion)window.VTGBuyerAtlas.setRegion(region);else pendingRegion=region;});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
