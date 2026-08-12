(()=>{
  const LIB='https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js';
  const STYLE='https://tiles.openfreemap.org/styles/liberty';
  function run(doc){
    if(!doc || doc.getElementById('vtgAdvancedMapStyle')) return;
    const head=doc.head;
    const css=doc.createElement('style'); css.id='vtgAdvancedMapStyle'; css.textContent=`
      #mapDrawer .drawerPanel{width:min(1180px,99vw)!important;padding:18px!important;background:#f4f7f8}
      #mapDrawer .vtgMapShell{position:relative;background:#fff;border:1px solid #dbe5e9;border-radius:18px;overflow:hidden;box-shadow:0 18px 55px rgba(7,31,48,.14)}
      #mapDrawer .vtgMapTop{display:grid;grid-template-columns:minmax(280px,1fr) auto auto auto;gap:8px;padding:12px;background:rgba(255,255,255,.96);border-bottom:1px solid #dbe5e9;position:relative;z-index:5}
      #mapDrawer .vtgMapTop input{height:42px;border:1px solid #ccdce2;border-radius:11px;padding:0 13px;outline:0;font-size:12px;background:#fff}
      #mapDrawer .vtgMapTop input:focus{border-color:#0e969f;box-shadow:0 0 0 3px rgba(14,150,159,.12)}
      #mapDrawer .vtgMapBtn{height:42px;border:1px solid #d3e0e5;background:#fff;color:#123b57;border-radius:11px;padding:0 12px;display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700}
      #mapDrawer .vtgMapBtn.primary{background:#123b57;color:#fff;border-color:#123b57}
      #mapDrawer .vtgMapBtn:hover{border-color:#0e969f;color:#0e969f}
      #mapDrawer .vtgMapBtn.primary:hover{color:#fff;background:#0e6f7a}
      #mapDrawer .vtgMapViewport{height:min(74vh,720px);min-height:520px;position:relative}
      #mapDrawer #vtgAdvancedMap{position:absolute;inset:0}
      #mapDrawer .vtgMapSide{position:absolute;top:14px;left:14px;z-index:4;width:235px;background:rgba(255,255,255,.95);border:1px solid #dbe5e9;border-radius:14px;box-shadow:0 10px 35px rgba(7,31,48,.15);overflow:hidden}
      #mapDrawer .vtgMapSide h4{margin:0;padding:12px 13px;border-bottom:1px solid #e3ebee;font-size:11px;color:#123b57}
      #mapDrawer .vtgLayer{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;font-size:10px;color:#526d7e;border-bottom:1px solid #edf2f4}
      #mapDrawer .vtgLayer button{border:0;background:#eaf4f6;color:#123b57;border-radius:8px;padding:5px 7px;font-size:8px;font-weight:800}
      #mapDrawer .vtgMapTools{position:absolute;right:14px;top:14px;z-index:4;display:grid;gap:7px}
      #mapDrawer .vtgTool{width:42px;height:42px;border:1px solid #d5e1e5;background:rgba(255,255,255,.96);border-radius:11px;color:#123b57;display:grid;place-items:center;box-shadow:0 8px 24px rgba(7,31,48,.12);font-size:16px;font-weight:800}
      #mapDrawer .vtgTool:hover{color:#0e969f;border-color:#0e969f}
      #mapDrawer .vtgMapStatus{position:absolute;left:14px;bottom:14px;z-index:4;background:rgba(7,31,48,.9);color:#fff;border-radius:10px;padding:8px 10px;font-size:8px;max-width:340px}
      #mapDrawer .vtgMapBottom{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 12px;background:#fff;border-top:1px solid #dbe5e9;color:#607586;font-size:8px}
      #mapDrawer .vtgMapModes{display:flex;gap:5px;flex-wrap:wrap}
      #mapDrawer .vtgMode{border:1px solid #dbe5e9;background:#fff;border-radius:8px;padding:6px 9px;font-size:8px;font-weight:800;color:#123b57}
      #mapDrawer .vtgMode.active{background:#eaf4f6;border-color:#0e969f;color:#087e86}
      @media(max-width:700px){#mapDrawer .vtgMapTop{grid-template-columns:1fr 1fr}.vtgMapTop input{grid-column:1/-1}#mapDrawer .vtgMapSide{width:190px}.vtgMapViewport{min-height:460px!important;height:70vh!important}}
    `; head.appendChild(css);
    const old=doc.getElementById('mapDrawer'); if(!old) return;
    old.innerHTML=`<aside class="drawerPanel"><div class="drawerTop"><div><span class="eyebrow">Current world atlas</span><h2>Advanced Trade Atlas</h2><div style="font-size:9px;color:#607586;margin-top:4px">Find verified companies, suppliers, banks, ports, cities and trade hubs.</div></div><button class="close" id="vtgMapClose" aria-label="Close map">×</button></div>
      <div class="vtgMapShell"><div class="vtgMapTop"><input id="vtgMapSearch" placeholder="Search country, city, port, supplier, bank or address" autocomplete="off"><button class="vtgMapBtn primary" id="vtgFind">⌕ Find</button><button class="vtgMapBtn" id="vtgLocate">◎ My location</button><button class="vtgMapBtn" id="vtgReset">⌖ World</button></div>
      <div class="vtgMapViewport"><div id="vtgAdvancedMap"></div>
        <div class="vtgMapSide"><h4>Map layers</h4><div class="vtgLayer">Standard atlas <button data-mode="standard">ACTIVE</button></div><div class="vtgLayer">Satellite-style view <button data-mode="satellite">VIEW</button></div><div class="vtgLayer">Trade hubs <button data-layer="hubs">SHOW</button></div><div class="vtgLayer">Ports & logistics <button data-layer="ports">SHOW</button></div><div class="vtgLayer">Business locations <button data-layer="business">SHOW</button></div></div>
        <div class="vtgMapTools"><button class="vtgTool" id="vtgZoomIn" title="Zoom in">+</button><button class="vtgTool" id="vtgZoomOut" title="Zoom out">−</button><button class="vtgTool" id="vtgCompass" title="Reset north">N</button><button class="vtgTool" id="vtgFullscreen" title="Fullscreen">□</button></div>
        <div class="vtgMapStatus" id="vtgMapStatus">World view • drag to explore • scroll to zoom • click the globe to inspect regions.</div>
      </div><div class="vtgMapBottom"><div class="vtgMapModes"><button class="vtgMode active" data-proj="globe">3D Globe</button><button class="vtgMode" data-proj="mercator">2D Map</button><button class="vtgMode" id="vtgTraffic">Traffic / routes</button><button class="vtgMode" id="vtgMeasure">Measure</button></div><span>OpenStreetMap / OpenFreeMap data • location search via Nominatim</span></div></div></aside>`;
    const close=doc.getElementById('vtgMapClose'); close.onclick=()=>{old.classList.remove('open');doc.body.style.overflow=''};
    if(!doc.querySelector('script[data-vtg-maplibre]')){const s=doc.createElement('script');s.src=LIB;s.dataset.vtgMaplibre='1';head.appendChild(s);s.onload=()=>init(doc)} else init(doc);
  }
  function init(doc){
    const ml=doc.defaultView.maplibregl;if(!ml)return setTimeout(()=>init(doc),100);
    const map=new ml.Map({container:doc.getElementById('vtgAdvancedMap'),style:STYLE,center:[8.6753,9.082],zoom:1.15,projection:{type:'globe'},attributionControl:false});
    map.addControl(new ml.NavigationControl({showCompass:true,showZoom:true}),'bottom-right');
    map.addControl(new ml.ScaleControl({maxWidth:140,unit:'metric'}),'bottom-left');
    map.addControl(new ml.FullscreenControl(),'bottom-right');
    let marker=null,measure=false,points=[];
    const status=t=>{doc.getElementById('vtgMapStatus').textContent=t};
    const search=async()=>{const q=doc.getElementById('vtgMapSearch').value.trim();if(!q)return;status('Searching for '+q+'…');try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});const d=await r.json();if(!d.length){status('No location found. Try a city, port, country or company address.');return}const x=d[0],lon=+x.lon,lat=+x.lat;map.flyTo({center:[lon,lat],zoom:13,duration:1400});if(marker)marker.remove();marker=new ml.Marker({color:'#0e969f'}).setLngLat([lon,lat]).setPopup(new ml.Popup({offset:12}).setHTML('<strong>'+x.display_name+'</strong><br><small>Location found by VTG Atlas</small>')).addTo(map);marker.togglePopup();status('Found: '+x.display_name)}catch(e){status('Search service unavailable. Please try again.')}};
    doc.getElementById('vtgFind').onclick=search;doc.getElementById('vtgMapSearch').onkeydown=e=>{if(e.key==='Enter')search()};
    doc.getElementById('vtgLocate').onclick=()=>{const g=doc.defaultView.navigator.geolocation;if(!g){status('Geolocation is not supported by this browser.');return}status('Finding your location…');g.getCurrentPosition(p=>{map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:14,duration:1400});if(marker)marker.remove();marker=new ml.Marker({color:'#d6a23a'}).setLngLat([p.coords.longitude,p.coords.latitude]).setPopup(new ml.Popup().setHTML('<strong>Your current location</strong>')).addTo(map);marker.togglePopup();status('Your current location')},()=>status('Location permission was not granted.'))};
    doc.getElementById('vtgReset').onclick=()=>{map.flyTo({center:[8.6753,9.082],zoom:1.15,duration:1000});status('World view restored.')};
    doc.getElementById('vtgZoomIn').onclick=()=>map.zoomIn();doc.getElementById('vtgZoomOut').onclick=()=>map.zoomOut();doc.getElementById('vtgCompass').onclick=()=>map.resetNorthPitch();doc.getElementById('vtgFullscreen').onclick=()=>doc.getElementById('vtgAdvancedMap').requestFullscreen?.();
    doc.querySelectorAll('[data-proj]').forEach(b=>b.onclick=()=>{const p=b.dataset.proj;map.setProjection({type:p});doc.querySelectorAll('[data-proj]').forEach(x=>x.classList.toggle('active',x===b));status(p==='globe'?'3D globe mode • explore the world':'2D atlas mode • explore streets and trade regions')});
    doc.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{status('Standard atlas mode selected. Satellite-style imagery can be connected to a licensed imagery provider when available.')});
    doc.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{const k=b.dataset.layer;status(k==='ports'?'Ports & logistics layer selected.':k==='hubs'?'Trade hubs layer selected.':'Business location layer selected.');b.textContent='ON';b.style.background='#dff4f5';});
    doc.getElementById('vtgTraffic').onclick=()=>status('Traffic / route intelligence selected. Live road traffic requires a traffic data provider; the atlas remains fully interactive without it.');
    doc.getElementById('vtgMeasure').onclick=()=>{measure=!measure;status(measure?'Measure mode: click two points on the map.':'Measure mode closed.');if(measure){const handler=e=>{points.push([e.lngLat.lng,e.lngLat.lat]);if(points.length===2){const R=6371,rad=x=>x*Math.PI/180,a=rad(points[0][1]),b=rad(points[1][1]),c=rad(points[1][0]-points[0][0]),d=rad(points[1][1]-points[0][1]);const h=Math.sin(d/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(c/2)**2;status('Approx. distance: '+(2*R*Math.asin(Math.sqrt(h))).toFixed(2)+' km');points=[];measure=false}};map.once('click',handler);map.once('click',handler)}};
    map.on('load',()=>{map.resize();status('World atlas ready • search, zoom, rotate, fullscreen and explore.')});
    doc.defaultView.addEventListener('resize',()=>map.resize());
  }
  function wait(){const f=document.querySelector('iframe#vtgFrame');if(!f)return setTimeout(wait,100);f.addEventListener('load',()=>{try{const d=f.contentDocument;const s=d.createElement('script');s.textContent='('+run.toString()+')(document)';d.body.appendChild(s)}catch(e){}},{once:true});try{if(f.contentDocument?.readyState==='complete')run(f.contentDocument)}catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
})();
