(() => {
  const LIB = 'https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js';
  const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const BLUE = {
    version: 8,
    sources: { marble: { type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/500m/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'], tileSize: 256, maxzoom: 8, attribution: 'Imagery © NASA EOSDIS GIBS / Blue Marble' } },
    layers: [{ id: 'marble', type: 'raster', source: 'marble' }]
  };
  const HUBS = [
    {name:'Lagos Trade Hub',city:'Lagos, Nigeria',lon:3.3792,lat:6.5244,type:'hub'},
    {name:'Tin Can Island Port',city:'Lagos, Nigeria',lon:3.3352,lat:6.4502,type:'port'},
    {name:'Apapa Port',city:'Lagos, Nigeria',lon:3.3590,lat:6.4488,type:'port'},
    {name:'Shanghai Port',city:'Shanghai, China',lon:121.4737,lat:31.2304,type:'port'},
    {name:'Guangzhou Trade Hub',city:'Guangzhou, China',lon:113.2644,lat:23.1291,type:'hub'},
    {name:'Nansha Port',city:'Guangzhou, China',lon:113.52,lat:22.77,type:'port'},
    {name:'Jebel Ali Port',city:'Dubai, UAE',lon:55.06,lat:24.99,type:'port'},
    {name:'Dubai Trade Hub',city:'Dubai, UAE',lon:55.2708,lat:25.2048,type:'hub'},
    {name:'Singapore Port',city:'Singapore',lon:103.8198,lat:1.2644,type:'port'},
    {name:'Rotterdam Port',city:'Rotterdam, Netherlands',lon:4.4777,lat:51.9244,type:'port'}
  ];
  const ROUTES = [
    [[3.3352,6.4502],[55.06,24.99],[113.52,22.77],[121.4737,31.2304]],
    [[3.3352,6.4502],[103.8198,1.2644],[121.4737,31.2304]],
    [[3.3352,6.4502],[4.4777,51.9244]]
  ];
  let scriptLoading;
  function loadLib(){ if(window.maplibregl) return Promise.resolve(); if(scriptLoading) return scriptLoading; scriptLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=LIB;s.onload=resolve;s.onerror=reject;s.dataset.vtgTradeMap='1';document.head.appendChild(s)});return scriptLoading; }
  function markup(){
    const d=document.getElementById('mapDrawer'); if(!d) return null;
    d.innerHTML=`<div class="drawerPanel vtgTradePanel"><div class="drawerTop"><div><div class="eyebrow">VTG GLOBAL TRADE ATLAS</div><h2>Ports, Logistics & Trade Hubs</h2><p style="font-size:11px;color:var(--muted);margin:4px 0 0">Explore VTG trade corridors, Nigerian ports, global hubs and searchable locations.</p></div><button class="close" id="vtgMapClose">&times;</button></div><div class="vtgMapShell"><div class="vtgMapTop"><input id="vtgMapSearch" placeholder="Search Lagos, Tin Can Island, Shanghai, Jebel Ali…"><button class="vtgMapBtn primary" id="vtgFind">Find</button><button class="vtgMapBtn" id="vtgLocate">My location</button><button class="vtgMapBtn" id="vtgWorld">World</button></div><div class="vtgMapViewport"><div id="vtgAdvancedMap"></div><div class="vtgMapSide"><h4>Map layers</h4><div class="vtgLayer">Trade hubs <button data-layer="hubs">SHOW</button></div><div class="vtgLayer">Ports & logistics <button data-layer="ports">SHOW</button></div><div class="vtgLayer">Trade corridors <button data-layer="routes">SHOW</button></div></div><div class="vtgMapTools"><button class="vtgTool" id="vtgZoomIn">+</button><button class="vtgTool" id="vtgZoomOut">−</button><button class="vtgTool" id="vtgNorth">N</button><button class="vtgTool" id="vtgFullscreen">□</button></div><div class="vtgMapStatus" id="vtgMapStatus">Loading VTG Trade Atlas…</div></div><div class="vtgMapBottom"><div class="vtgMapModes"><button class="vtgMode active" data-proj="globe">3D Globe</button><button class="vtgMode" data-proj="mercator">2D Map</button><button class="vtgMode" id="vtgSatellite">Satellite</button><button class="vtgMode" id="vtgMeasure">Measure</button></div><span>NASA Blue Marble • OpenFreeMap • OpenStreetMap/Nominatim</span></div></div></div>`;
    const style=document.createElement('style');style.id='vtgTradeMapStyle';style.textContent=`#mapDrawer .vtgTradePanel{width:min(1180px,99vw)!important;padding:18px!important;background:#f4f7f8}#mapDrawer .vtgMapShell{background:#fff;border:1px solid #dbe5e9;border-radius:18px;overflow:hidden;box-shadow:0 18px 55px rgba(7,31,48,.14)}#mapDrawer .vtgMapTop{display:grid;grid-template-columns:minmax(280px,1fr) auto auto auto;gap:8px;padding:12px;background:rgba(255,255,255,.97);border-bottom:1px solid #dbe5e9}.vtgMapTop input{height:42px;border:1px solid #ccdce2;border-radius:11px;padding:0 13px;font-size:12px}.vtgMapBtn{height:42px;border:1px solid #d3e0e5;background:#fff;color:#123b57;border-radius:11px;padding:0 12px;font-size:11px;font-weight:700}.vtgMapBtn.primary{background:#123b57;color:#fff}.vtgMapViewport{height:min(74vh,720px);min-height:520px;position:relative}.vtgMapViewport>#vtgAdvancedMap{position:absolute;inset:0}.vtgMapSide{position:absolute;top:14px;left:14px;z-index:4;width:245px;background:rgba(255,255,255,.96);border:1px solid #dbe5e9;border-radius:14px;box-shadow:0 10px 35px rgba(7,31,48,.15);overflow:hidden}.vtgMapSide h4{margin:0;padding:12px;border-bottom:1px solid #e3ebee;color:#123b57}.vtgLayer{display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #edf2f4;font-size:10px}.vtgLayer button{border:0;background:#eaf4f6;color:#123b57;border-radius:8px;padding:5px 8px;font-size:8px;font-weight:800}.vtgMapTools{position:absolute;right:14px;top:14px;z-index:4;display:grid;gap:7px}.vtgTool{width:42px;height:42px;border:1px solid #d5e1e5;background:rgba(255,255,255,.96);border-radius:11px;color:#123b57;display:grid;place-items:center;box-shadow:0 8px 24px rgba(7,31,48,.12);font-weight:800}.vtgMapStatus{position:absolute;left:14px;bottom:14px;z-index:4;background:rgba(7,31,48,.9);color:#fff;border-radius:10px;padding:8px 10px;font-size:8px;max-width:380px}.vtgMapBottom{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 12px;background:#fff;border-top:1px solid #dbe5e9;color:#607586;font-size:8px}.vtgMapModes{display:flex;gap:5px;flex-wrap:wrap}.vtgMode{border:1px solid #dbe5e9;background:#fff;border-radius:8px;padding:6px 9px;font-size:8px;font-weight:800;color:#123b57}.vtgMode.active{background:#eaf4f6;border-color:#0e969f;color:#087e86}.vtgMapPopup h4{margin:0 0 4px;color:#123b57}.vtgMapPopup p{margin:0;font-size:10px;color:#607586}@media(max-width:700px){#mapDrawer .vtgMapTop{grid-template-columns:1fr 1fr}#mapDrawer .vtgMapTop input{grid-column:1/-1}#mapDrawer .vtgMapSide{width:190px}.vtgMapViewport{min-height:460px!important;height:70vh!important}}`;document.head.appendChild(style);return d;
  }
  async function init(){
    const d=markup(); if(!d)return; await loadLib();
    const ml=window.maplibregl; if(!ml)return;
    const container=document.getElementById('vtgAdvancedMap'); if(!container)return;
    const map=new ml.Map({container,style:BLUE,center:[20,8],zoom:1.35,projection:{type:'globe'},attributionControl:false});
    window.__vtgTradeMap=map; let marker; let measure=false; let measurePoints=[]; let currentStyle='satellite';
    const status=t=>{const x=document.getElementById('vtgMapStatus');if(x)x.textContent=t};
    const addData=()=>{
      if(!map.isStyleLoaded())return;
      if(!map.getSource('vtg-locations'))map.addSource('vtg-locations',{type:'geojson',data:{type:'FeatureCollection',features:HUBS.map(x=>({type:'Feature',geometry:{type:'Point',coordinates:[x.lon,x.lat]},properties:x}))}});
      if(!map.getLayer('vtg-ports'))map.addLayer({id:'vtg-ports',type:'circle',source:'vtg-locations',filter:['==',['get','type'],'port'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],1,4,5,7,10,10],'circle-color':'#d6a23a','circle-stroke-color':'#fff','circle-stroke-width':1.5}});
      if(!map.getLayer('vtg-hubs'))map.addLayer({id:'vtg-hubs',type:'circle',source:'vtg-locations',filter:['==',['get','type'],'hub'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],1,5,5,8,10,11],'circle-color':'#0e969f','circle-stroke-color':'#fff','circle-stroke-width':2}});
      if(!map.getSource('vtg-routes'))map.addSource('vtg-routes',{type:'geojson',data:{type:'FeatureCollection',features:ROUTES.map((coords,i)=>({type:'Feature',properties:{name:'VTG trade corridor '+(i+1)},geometry:{type:'LineString',coordinates:coords}}))}});
      if(!map.getLayer('vtg-routes'))map.addLayer({id:'vtg-routes',type:'line',source:'vtg-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0e969f','line-width':2.5,'line-opacity':.78,'line-dasharray':[2,2]}});
      map.on('click','vtg-ports',e=>{const p=e.features[0].properties;new ml.Popup().setLngLat(e.lngLat).setHTML(`<div class="vtgMapPopup"><h4>${p.name}</h4><p>${p.city}<br>Port & logistics location</p></div>`).addTo(map)});
      map.on('click','vtg-hubs',e=>{const p=e.features[0].properties;new ml.Popup().setLngLat(e.lngLat).setHTML(`<div class="vtgMapPopup"><h4>${p.name}</h4><p>${p.city}<br>VTG trade hub</p></div>`).addTo(map)});
      ['vtg-ports','vtg-hubs','vtg-routes'].forEach(id=>map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer'));
      ['vtg-ports','vtg-hubs','vtg-routes'].forEach(id=>map.on('mouseleave',id,()=>map.getCanvas().style.cursor=''));
      status('VTG Trade Atlas ready • Nigerian ports, global hubs and trade corridors are visible.');
    };
    map.on('load',()=>{map.resize();addData()});
    map.on('styledata',()=>{try{addData()}catch(e){}});
    const find=async()=>{const q=document.getElementById('vtgMapSearch').value.trim();if(!q)return;status('Searching for '+q+'…');try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});const a=await r.json();if(!a.length){status('No location found. Try a port, city, country or company address.');return}const x=a[0],lon=+x.lon,lat=+x.lat;map.setStyle(STYLE);currentStyle='standard';map.once('styledata',()=>{map.flyTo({center:[lon,lat],zoom:12,duration:1200});addData()});if(marker)marker.remove();marker=new ml.Marker({color:'#0e969f'}).setLngLat([lon,lat]).setPopup(new ml.Popup({offset:12}).setHTML('<b>'+x.display_name+'</b><br><small>Location found by VTG Atlas</small>')).addTo(map);marker.togglePopup();status('Found: '+x.display_name)}catch(e){status('Location search is temporarily unavailable.')}};
    document.getElementById('vtgFind').onclick=find;document.getElementById('vtgMapSearch').onkeydown=e=>{if(e.key==='Enter')find()};
    document.getElementById('vtgLocate').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>{map.setStyle(STYLE);map.once('styledata',()=>{map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:13,duration:1200});addData()});status('Your current location')},()=>status('Location permission was not granted.'));
    document.getElementById('vtgWorld').onclick=()=>map.flyTo({center:[20,8],zoom:1.35,duration:1000});
    document.getElementById('vtgZoomIn').onclick=()=>map.zoomIn();document.getElementById('vtgZoomOut').onclick=()=>map.zoomOut();document.getElementById('vtgNorth').onclick=()=>map.resetNorthPitch();document.getElementById('vtgFullscreen').onclick=()=>container.requestFullscreen?.();
    document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{const id=b.dataset.layer==='ports'?'vtg-ports':b.dataset.layer==='hubs'?'vtg-hubs':'vtg-routes';const visible=map.getLayoutProperty(id,'visibility')!=='none';map.setLayoutProperty(id,'visibility',visible?'none':'visible');b.textContent=visible?'HIDDEN':'ON';status((b.dataset.layer==='ports'?'Ports & logistics':b.dataset.layer==='hubs'?'Trade hubs':'Trade corridors')+(visible?' hidden.':' visible.'))});
    document.querySelectorAll('[data-proj]').forEach(b=>b.onclick=()=>{map.setProjection({type:b.dataset.proj});document.querySelectorAll('[data-proj]').forEach(x=>x.classList.toggle('active',x===b));status(b.dataset.proj==='globe'?'3D globe mode':'2D map mode')});
    document.getElementById('vtgSatellite').onclick=()=>{currentStyle=currentStyle==='satellite'?'standard':'satellite';map.setStyle(currentStyle==='satellite'?BLUE:STYLE);map.once('styledata',addData);status(currentStyle==='satellite'?'NASA Blue Marble imagery enabled.':'Standard street atlas enabled.')};
    document.getElementById('vtgMeasure').onclick=()=>{measure=!measure;measurePoints=[];status(measure?'Measure mode: click two points on the map.':'Measure mode closed.');if(measure){const fn=e=>{measurePoints.push([e.lngLat.lng,e.lngLat.lat]);if(measurePoints.length===2){const [a,b]=measurePoints,R=6371,rad=x=>x*Math.PI/180,dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]),aa=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;status('Approx. distance: '+(2*R*Math.asin(Math.sqrt(aa))).toFixed(2)+' km');measure=false;measurePoints=[]}};map.once('click',fn)}};
    document.getElementById('vtgMapClose').onclick=()=>{d.classList.remove('open');document.body.style.overflow='';setTimeout(()=>map.resize(),100)};
    setTimeout(()=>map.resize(),250);setTimeout(()=>map.resize(),1000);window.addEventListener('resize',()=>map.resize());
  }
  window.VTGInitTradeMap=()=>{if(window.__vtgTradeMap)return;init()};
})();