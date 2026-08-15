(() => {
  let started = false;
  const loadScript = (src, ready) => new Promise((resolve, reject) => {
    if (ready()) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      const timer = setInterval(() => { if (ready()) { clearInterval(timer); resolve(); } }, 50);
      setTimeout(() => { clearInterval(timer); ready() ? resolve() : reject(new Error('Timed out loading ' + src)); }, 12000);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => ready() ? resolve() : reject(new Error('Loaded but unavailable: ' + src));
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const mapStyle = () => ({version:8,sources:{marble:{type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/500m/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],tileSize:256,attribution:'Imagery © NASA EOSDIS GIBS / Blue Marble'}},layers:[{id:'marble',type:'raster',source:'marble'}]});
  const streetStyle = 'https://tiles.openfreemap.org/styles/liberty';
  const geo = items => ({type:'FeatureCollection',features:items.map(x=>({type:'Feature',geometry:{type:'Point',coordinates:[x.lon,x.lat]},properties:x}))});
  const lines = items => ({type:'FeatureCollection',features:items.map(x=>({type:'Feature',geometry:{type:'LineString',coordinates:x.coords},properties:{name:x.name}}))});
  const status = text => { const el=document.getElementById('vtgMapStatus'); if(el) el.textContent=text; };

  function addLayers(map, n) {
    if (!map.isStyleLoaded()) return;
    const sets=[
      ['vtg-countries',geo(n.countries),'circle',{'circle-radius':['interpolate',['linear'],['zoom'],1,2.5,5,4.5,9,7],'circle-color':'#54758a','circle-opacity':.62,'circle-stroke-color':'#fff','circle-stroke-width':.7}],
      ['vtg-ports',geo(n.ports),'circle',{'circle-radius':['interpolate',['linear'],['zoom'],1,3.5,5,6,9,10],'circle-color':'#d6a23a','circle-stroke-color':'#fff','circle-stroke-width':1.3}],
      ['vtg-asiaPorts',geo(n.asiaPorts),'circle',{'circle-radius':['interpolate',['linear'],['zoom'],1,4,5,6,9,10],'circle-color':'#7657a6','circle-stroke-color':'#fff','circle-stroke-width':1.4}],
      ['vtg-hubs',geo(n.asiaHubs),'circle',{'circle-radius':['interpolate',['linear'],['zoom'],1,5,5,8,9,12],'circle-color':'#0e969f','circle-stroke-color':'#fff','circle-stroke-width':2}],
    ];
    sets.forEach(([id,data,type,paint])=>{const src=id+'-src';if(map.getSource(src))map.getSource(src).setData(data);else map.addSource(src,{type:'geojson',data});if(!map.getLayer(id))map.addLayer({id,type,source:src,paint});});
    if(!map.getSource('vtg-routes-src')) map.addSource('vtg-routes-src',{type:'geojson',data:lines(n.corridors)}); else map.getSource('vtg-routes-src').setData(lines(n.corridors));
    if(!map.getLayer('vtg-routes')) map.addLayer({id:'vtg-routes',type:'line',source:'vtg-routes-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0e969f','line-width':['interpolate',['linear'],['zoom'],1,1.2,5,2.5,9,4],'line-opacity':.75,'line-dasharray':[2,2]}});
    [['vtg-countries','country'],['vtg-ports','port'],['vtg-asiaPorts','asiaPort'],['vtg-hubs','hub']].forEach(([layer,type])=>{
      if(map.getLayer(layer) && !map.getLayer(layer)._vtgBound){map.on('click',layer,e=>{const p=e.features?.[0]?.properties||{};new window.maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<div class="vtgMapPopup"><h4>${p.name||p.country||'Trade location'}</h4><p>${p.city||p.country||'VTG trade network'}<br>VTG ${type} location</p></div>`).addTo(map)});map.on('mouseenter',layer,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',layer,()=>map.getCanvas().style.cursor='');map.getLayer(layer)._vtgBound=true;}
    });
    status('VTG Trade Atlas ready • 54 African countries • African ports • China & South Korea gateways • trade corridors.');
  }

  async function start() {
    if(started) return;
    const container=document.getElementById('vtgAdvancedMap');
    if(!container) return;
    started=true;
    try {
      status('Loading map engine…');
      await Promise.all([loadScript('https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js',()=>!!window.maplibregl),loadScript('/vtg-africa-asia-network.js?v=20260815',()=>!!window.VTGTradeNetwork)]);
      const map=new window.maplibregl.Map({container,style:mapStyle(),center:[25,8],zoom:1.45,projection:{type:'globe'},attributionControl:false});
      window.__vtgTradeMap=map;
      const find=async()=>{const q=document.getElementById('vtgMapSearch')?.value.trim();if(!q)return;const n=window.VTGTradeNetwork;const hit=[...n.countries,...n.ports,...n.asiaPorts,...n.asiaHubs].find(x=>String(x.country||'').toLowerCase().includes(q.toLowerCase())||String(x.city||'').toLowerCase().includes(q.toLowerCase())||String(x.name||'').toLowerCase().includes(q.toLowerCase()));if(hit){map.flyTo({center:[hit.lon,hit.lat],zoom:hit.type==='country'?5:9,duration:1100});status('Found: '+(hit.name||hit.country));return;}try{const r=await fetch('/api/market/geocode?q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});const d=await r.json();if(d.results?.[0]){const x=d.results[0];map.flyTo({center:[x.lon,x.lat],zoom:10,duration:1100});status('Found: '+x.name)}else status('Location not found.');}catch(e){status('Location search temporarily unavailable.')}};
      map.on('load',()=>{addLayers(map,window.VTGTradeNetwork);map.resize();});
      map.on('styledata',()=>{try{addLayers(map,window.VTGTradeNetwork)}catch(e){}});
      document.getElementById('vtgFind')?.addEventListener('click',find);document.getElementById('vtgMapSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')find()});
      document.getElementById('vtgLocate')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>{map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:12,duration:900});status('Centered on your location.')},()=>status('Location permission was not granted.')));
      document.getElementById('vtgWorld')?.addEventListener('click',()=>map.flyTo({center:[25,8],zoom:1.45,duration:900}));document.getElementById('vtgZoomIn')?.addEventListener('click',()=>map.zoomIn());document.getElementById('vtgZoomOut')?.addEventListener('click',()=>map.zoomOut());document.getElementById('vtgNorth')?.addEventListener('click',()=>map.resetNorthPitch());document.getElementById('vtgFullscreen')?.addEventListener('click',()=>container.requestFullscreen?.());
      document.querySelectorAll('[data-layer]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.layer==='countries'?'vtg-countries':btn.dataset.layer==='ports'?'vtg-ports':btn.dataset.layer==='asiaPorts'?'vtg-asiaPorts':btn.dataset.layer==='hubs'?'vtg-hubs':'vtg-routes';const visible=map.getLayoutProperty(id,'visibility')!=='none';map.setLayoutProperty(id,'visibility',visible?'none':'visible');btn.textContent=visible?'OFF':'ON';status(id+(visible?' hidden':' visible'));}));
      document.querySelectorAll('[data-proj]').forEach(btn=>btn.addEventListener('click',()=>{map.setProjection({type:btn.dataset.proj});document.querySelectorAll('[data-proj]').forEach(x=>x.classList.toggle('active',x===btn))}));
      document.getElementById('vtgSatellite')?.addEventListener('click',()=>{const on=document.getElementById('vtgSatellite').dataset.sat!=='1';document.getElementById('vtgSatellite').dataset.sat=on?'1':'0';map.setStyle(on?mapStyle():streetStyle);map.once('styledata',()=>addLayers(map,window.VTGTradeNetwork));status(on?'NASA Blue Marble enabled.':'Street map enabled.');});
      let measure=false,points=[];document.getElementById('vtgMeasure')?.addEventListener('click',()=>{measure=!measure;points=[];status(measure?'Measure mode: click two points.':'Measure mode closed.');});map.on('click',e=>{if(!measure)return;points.push([e.lngLat.lng,e.lngLat.lat]);if(points.length===2){const [a,b]=points,R=6371,rad=v=>v*Math.PI/180,dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]),h=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;status('Approx. distance: '+(2*R*Math.asin(Math.sqrt(h))).toFixed(2)+' km');measure=false;points=[];}});
      const resize=()=>map.resize();window.addEventListener('resize',resize);setTimeout(resize,250);setTimeout(resize,1000);setTimeout(resize,2000);
    } catch(e){started=false;console.error('VTG map recovery failed',e);status('Map could not initialize. Refresh and try again.');}
  }
  window.VTGStartMapRecovery=start;
  const boot=()=>{if(document.getElementById('vtgAdvancedMap'))start();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  setTimeout(boot,500);setTimeout(boot,1500);setTimeout(boot,3000);
})();
