(() => {
  const LIB = 'https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js';
  const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  // NASA GIBS Blue Marble true-color imagery — free, no API key, matches
  // the realistic Earth-from-space look. Used as the default globe view.
  const BLUE_MARBLE_STYLE = {
    version: 8,
    sources: {
      'blue-marble': {
        type: 'raster',
        tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/500m/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
        tileSize: 256,
        maxzoom: 8,
        attribution: 'Imagery © NASA EOSDIS GIBS / Blue Marble'
      }
    },
    layers: [{ id: 'blue-marble', type: 'raster', source: 'blue-marble' }]
  };

  // Curated set of major, well-known seaports and airports — Africa (a
  // representative major hub for most trading nations), China and South
  // Korea. This is not a claim of exhaustive coverage of every port/airport
  // in every country — it's the genuinely major, verifiable hubs.
  const PORTS = [
    { name: 'Lagos (Apapa / Tin Can)', country: 'Nigeria', lat: 6.4474, lon: 3.3903 },
    { name: 'Port Harcourt', country: 'Nigeria', lat: 4.7719, lon: 7.0134 },
    { name: 'Durban', country: 'South Africa', lat: -29.8622, lon: 31.0247 },
    { name: 'Cape Town', country: 'South Africa', lat: -33.9075, lon: 18.4356 },
    { name: 'Mombasa', country: 'Kenya', lat: -4.0619, lon: 39.6636 },
    { name: 'Dar es Salaam', country: 'Tanzania', lat: -6.8235, lon: 39.2916 },
    { name: 'Tema', country: 'Ghana', lat: 5.6362, lon: -0.0088 },
    { name: 'Abidjan', country: "Côte d'Ivoire", lat: 5.2836, lon: -4.0219 },
    { name: 'Dakar', country: 'Senegal', lat: 14.6708, lon: -17.4324 },
    { name: 'Alexandria', country: 'Egypt', lat: 31.2001, lon: 29.9187 },
    { name: 'Casablanca', country: 'Morocco', lat: 33.6022, lon: -7.6187 },
    { name: 'Tangier Med', country: 'Morocco', lat: 35.8836, lon: -5.5013 },
    { name: 'Algiers', country: 'Algeria', lat: 36.7631, lon: 3.0658 },
    { name: 'Tunis (La Goulette)', country: 'Tunisia', lat: 36.8189, lon: 10.3053 },
    { name: 'Djibouti', country: 'Djibouti', lat: 11.5952, lon: 43.1456 },
    { name: 'Maputo', country: 'Mozambique', lat: -25.9689, lon: 32.5814 },
    { name: 'Luanda', country: 'Angola', lat: -8.8137, lon: 13.2302 },
    { name: 'Douala', country: 'Cameroon', lat: 4.0483, lon: 9.7043 },
    { name: 'Lomé', country: 'Togo', lat: 6.1214, lon: 1.2769 },
    { name: 'Cotonou', country: 'Benin', lat: 6.3573, lon: 2.4331 },
    { name: 'Libreville (Owendo)', country: 'Gabon', lat: 0.2969, lon: 9.4934 },
    { name: 'Walvis Bay', country: 'Namibia', lat: -22.9576, lon: 14.5053 },
    { name: 'Shanghai (Yangshan)', country: 'China', lat: 30.6244, lon: 122.0672 },
    { name: 'Shenzhen (Yantian)', country: 'China', lat: 22.5721, lon: 114.2696 },
    { name: 'Ningbo-Zhoushan', country: 'China', lat: 29.8683, lon: 121.9235 },
    { name: 'Guangzhou (Nansha)', country: 'China', lat: 22.7568, lon: 113.5983 },
    { name: 'Qingdao', country: 'China', lat: 36.0671, lon: 120.3826 },
    { name: 'Tianjin', country: 'China', lat: 38.9847, lon: 117.7196 },
    { name: 'Xiamen', country: 'China', lat: 24.4531, lon: 118.0894 },
    { name: 'Busan', country: 'South Korea', lat: 35.1028, lon: 129.0403 },
    { name: 'Incheon (Port)', country: 'South Korea', lat: 37.4563, lon: 126.6292 },
    { name: 'Gwangyang', country: 'South Korea', lat: 34.9067, lon: 127.7594 }
  ];

  const AIRPORTS = [
    { name: 'Murtala Muhammed Intl (LOS)', country: 'Nigeria', lat: 6.5774, lon: 3.3212 },
    { name: 'Nnamdi Azikiwe Intl (ABV)', country: 'Nigeria', lat: 9.0068, lon: 7.2632 },
    { name: 'O.R. Tambo Intl (JNB)', country: 'South Africa', lat: -26.1392, lon: 28.246 },
    { name: 'Cape Town Intl (CPT)', country: 'South Africa', lat: -33.9715, lon: 18.6021 },
    { name: 'Jomo Kenyatta Intl (NBO)', country: 'Kenya', lat: -1.3192, lon: 36.9278 },
    { name: 'Bole Intl (ADD)', country: 'Ethiopia', lat: 8.9779, lon: 38.7993 },
    { name: 'Cairo Intl (CAI)', country: 'Egypt', lat: 30.1219, lon: 31.4056 },
    { name: 'Mohammed V Intl (CMN)', country: 'Morocco', lat: 33.3675, lon: -7.59 },
    { name: 'Houari Boumediene (ALG)', country: 'Algeria', lat: 36.691, lon: 3.2154 },
    { name: 'Kotoka Intl (ACC)', country: 'Ghana', lat: 5.6052, lon: -0.1668 },
    { name: 'Félix-Houphouët-Boigny (ABJ)', country: "Côte d'Ivoire", lat: 5.2614, lon: -3.9263 },
    { name: 'Blaise Diagne Intl (DSS)', country: 'Senegal', lat: 14.6702, lon: -17.0733 },
    { name: 'Julius Nyerere Intl (DAR)', country: 'Tanzania', lat: -6.8781, lon: 39.2026 },
    { name: 'O.R. Tambo alt. Lusaka KKIA (LUN)', country: 'Zambia', lat: -15.3308, lon: 28.4526 },
    { name: 'Kigali Intl (KGL)', country: 'Rwanda', lat: -1.9686, lon: 30.1395 },
    { name: 'Kamuzu Intl (LLW)', country: 'Malawi', lat: -13.7894, lon: 33.7811 },
    { name: 'Robert Mugabe/Harare (HRE)', country: 'Zimbabwe', lat: -17.9318, lon: 31.0928 },
    { name: 'Maputo Intl (MPM)', country: 'Mozambique', lat: -25.9208, lon: 32.5726 },
    { name: 'Quatro de Fevereiro (LAD)', country: 'Angola', lat: -8.8584, lon: 13.2312 },
    { name: 'Douala Intl (DLA)', country: 'Cameroon', lat: 4.0061, lon: 9.7195 },
    { name: 'Beijing Capital (PEK)', country: 'China', lat: 40.0801, lon: 116.5846 },
    { name: 'Beijing Daxing (PKX)', country: 'China', lat: 39.5098, lon: 116.4105 },
    { name: 'Shanghai Pudong (PVG)', country: 'China', lat: 31.1443, lon: 121.8083 },
    { name: 'Guangzhou Baiyun (CAN)', country: 'China', lat: 23.3924, lon: 113.2988 },
    { name: 'Shenzhen Bao\'an (SZX)', country: 'China', lat: 22.6393, lon: 113.8107 },
    { name: 'Chengdu Tianfu (TFU)', country: 'China', lat: 30.3125, lon: 104.4417 },
    { name: 'Incheon Intl (ICN)', country: 'South Korea', lat: 37.4602, lon: 126.4407 },
    { name: 'Gimpo Intl (GMP)', country: 'South Korea', lat: 37.5583, lon: 126.7906 },
    { name: 'Busan Gimhae (PUS)', country: 'South Korea', lat: 35.1795, lon: 128.9382 },
    { name: 'Jeju Intl (CJU)', country: 'South Korea', lat: 33.5113, lon: 126.4930 }
  ];

  function run(doc) {
    if (!doc || doc.getElementById('vtgAdvancedMapStyle')) return;
    const head = doc.head;
    const css = doc.createElement('style'); css.id = 'vtgAdvancedMapStyle'; css.textContent = `
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

    const old = doc.getElementById('mapDrawer'); if (!old) return;
    old.innerHTML = `<div class="drawerPanel">
      <div class="drawerTop">
        <div><div class="eyebrow">Current world atlas</div><h2>Advanced Trade Atlas</h2><p style="font-size:11px;color:var(--muted);margin:4px 0 0">Find verified companies, suppliers, banks, ports, cities and trade hubs.</p></div>
        <button class="close" id="vtgMapClose">&times;</button>
      </div>
      <div class="vtgMapShell" style="margin-top:14px">
        <div class="vtgMapTop">
          <input id="vtgMapSearch" placeholder="Search a city, port, country or company address" />
          <button class="vtgMapBtn primary" id="vtgFind">Find</button>
          <button class="vtgMapBtn" id="vtgLocate">My location</button>
          <button class="vtgMapBtn" id="vtgReset">World</button>
        </div>
        <div class="vtgMapViewport">
          <div id="vtgAdvancedMap"></div>
          <div class="vtgMapSide">
            <h4>Map layers</h4>
            <div class="vtgLayer">Standard atlas <button data-mode="standard">ACTIVE</button></div>
            <div class="vtgLayer">Satellite-style view <button data-mode="satellite">VIEW</button></div>
            <div class="vtgLayer">Trade hubs <button data-layer="hubs">SHOW</button></div>
            <div class="vtgLayer">Ports &amp; logistics <button data-layer="ports">SHOW</button></div>
            <div class="vtgLayer">Business locations <button data-layer="business">SHOW</button></div>
          </div>
          <div class="vtgMapTools">
            <button class="vtgTool" id="vtgZoomIn">+</button>
            <button class="vtgTool" id="vtgZoomOut">&minus;</button>
            <button class="vtgTool" id="vtgCompass">N</button>
            <button class="vtgTool" id="vtgFullscreen">&#9633;</button>
          </div>
          <div class="vtgMapStatus" id="vtgMapStatus">World view &bull; drag to explore &bull; scroll to zoom &bull; click the globe to inspect regions.</div>
        </div>
        <div class="vtgMapBottom">
          <div class="vtgMapModes">
            <button class="vtgMode active" data-proj="globe">3D Globe</button>
            <button class="vtgMode" data-proj="mercator">2D Map</button>
            <button class="vtgMode" id="vtgTraffic">Traffic / routes</button>
            <button class="vtgMode" id="vtgMeasure">Measure</button>
          </div>
          <div>OpenStreetMap / OpenFreeMap data &bull; location search via Nominatim</div>
        </div>
      </div>
    </div>`;

    const close = doc.getElementById('vtgMapClose'); close.onclick = () => { old.classList.remove('open'); doc.body.style.overflow = '' };
    if (!doc.querySelector('script[data-vtg-maplibre]')) {
      const s = doc.createElement('script'); s.src = LIB; s.dataset.vtgMaplibre = '1'; head.appendChild(s); s.onload = () => init(doc);
    } else init(doc);
  }

  function init(doc) {
    const ml = window.maplibregl; if (!ml) return setTimeout(() => init(doc), 100);
    const map = new ml.Map({ container: doc.getElementById('vtgAdvancedMap'), style: BLUE_MARBLE_STYLE, center: [8.6753, 9.082], zoom: 1.15, projection: { type: 'globe' }, attributionControl: false });
    let currentStyle = 'satellite';
    map.addControl(new ml.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
    map.addControl(new ml.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left');
    map.addControl(new ml.FullscreenControl(), 'bottom-right');
    let marker = null, measure = false, points = [];
    const status = t => { doc.getElementById('vtgMapStatus').textContent = t };
    const search = async () => {
      const q = doc.getElementById('vtgMapSearch').value.trim(); if (!q) return;
      status('Searching for ' + q + '…');
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
        const d = await r.json();
        if (!d.length) { status('No location found. Try a city, port, country or company address.'); return }
        const x = d[0], lon = +x.lon, lat = +x.lat;
        const fly = () => map.flyTo({ center: [lon, lat], zoom: 13, duration: 1400 });
        if (currentStyle === 'satellite') { currentStyle = 'standard'; map.setStyle(STYLE); map.once('styledata', fly) } else fly();
        if (marker) marker.remove();
        marker = new ml.Marker({ color: '#0e969f' }).setLngLat([lon, lat]).setPopup(new ml.Popup({ offset: 12 }).setHTML('<b>' + x.display_name + '</b><br><small>Location found by VTG Atlas</small>')).addTo(map);
        marker.togglePopup(); status('Found: ' + x.display_name);
      } catch (e) { status('Search service unavailable. Please try again.') }
    };
    doc.getElementById('vtgFind').onclick = search;
    doc.getElementById('vtgMapSearch').onkeydown = e => { if (e.key === 'Enter') search() };
    doc.getElementById('vtgLocate').onclick = () => {
      const g = window.navigator.geolocation; if (!g) { status('Geolocation is not supported by this browser.'); return }
      status('Finding your location…');
      g.getCurrentPosition(p => {
        map.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14, duration: 1400 });
        if (marker) marker.remove();
        marker = new ml.Marker({ color: '#d6a23a' }).setLngLat([p.coords.longitude, p.coords.latitude]).setPopup(new ml.Popup().setHTML('Your current location')).addTo(map);
        marker.togglePopup(); status('Your current location');
      }, () => status('Location permission was not granted.'));
    };
    doc.getElementById('vtgReset').onclick = () => { map.flyTo({ center: [8.6753, 9.082], zoom: 1.15, duration: 1000 }); status('World view restored.') };
    doc.getElementById('vtgZoomIn').onclick = () => map.zoomIn();
    doc.getElementById('vtgZoomOut').onclick = () => map.zoomOut();
    doc.getElementById('vtgCompass').onclick = () => map.resetNorthPitch();
    doc.getElementById('vtgFullscreen').onclick = () => doc.getElementById('vtgAdvancedMap').requestFullscreen?.();
    doc.querySelectorAll('[data-proj]').forEach(b => b.onclick = () => {
      const p = b.dataset.proj; map.setProjection({ type: p });
      doc.querySelectorAll('[data-proj]').forEach(x => x.classList.toggle('active', x === b));
      status(p === 'globe' ? '3D globe mode • explore the world' : '2D atlas mode • explore streets and trade regions');
    });
    doc.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
      const mode = b.dataset.mode;
      if (mode === currentStyle) return;
      currentStyle = mode;
      map.setStyle(mode === 'satellite' ? BLUE_MARBLE_STYLE : STYLE);
      doc.querySelectorAll('[data-mode]').forEach(x => x.textContent = x.dataset.mode === 'satellite' ? (x.dataset.mode === currentStyle ? 'ACTIVE' : 'VIEW') : (x.dataset.mode === currentStyle ? 'ACTIVE' : 'VIEW'));
      status(mode === 'satellite'
        ? 'Real satellite Earth imagery (NASA Blue Marble). Zoom is limited to a country/region level — switch to Standard atlas for exact street addresses.'
        : 'Standard street atlas — full zoom to exact addresses, ports and business locations.');
    });
    let portMarkers = [], hubMarkers = [];
    const clearMarkers = arr => { arr.forEach(m => m.remove()); arr.length = 0 };
    const addMarker = (loc, color, kind) => {
      const m = new ml.Marker({ color }).setLngLat([loc.lon, loc.lat])
        .setPopup(new ml.Popup({ offset: 12 }).setHTML(`<b>${loc.name}</b><br><small>${loc.country} — major ${kind}</small>`))
        .addTo(map);
      return m;
    };
    doc.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => {
      const k = b.dataset.layer;
      const isOn = b.textContent.trim() === 'ON';
      if (k === 'ports') {
        if (isOn) { clearMarkers(portMarkers); b.textContent = 'SHOW'; b.style.background = ''; status('Ports & logistics layer hidden.'); return }
        portMarkers = PORTS.map(p => addMarker(p, '#0e969f', 'seaport'));
        b.textContent = 'ON'; b.style.background = '#dff4f5';
        status(`Ports & logistics layer: ${PORTS.length} major seaports shown across Africa, China and South Korea. Click a marker for details.`);
      } else if (k === 'hubs') {
        if (isOn) { clearMarkers(hubMarkers); b.textContent = 'SHOW'; b.style.background = ''; status('Trade hubs (airports) layer hidden.'); return }
        hubMarkers = AIRPORTS.map(a => addMarker(a, '#d6a23a', 'airport'));
        b.textContent = 'ON'; b.style.background = '#dff4f5';
        status(`Trade hubs layer: ${AIRPORTS.length} major airports shown across Africa, China and South Korea. Click a marker for details.`);
      } else {
        status('Business location layer requires suppliers to add their verified location — shown automatically once suppliers register.');
        b.textContent = isOn ? 'SHOW' : 'ON'; b.style.background = isOn ? '' : '#dff4f5';
      }
    });
    doc.getElementById('vtgTraffic').onclick = () => status('Traffic / route intelligence selected. Live road traffic requires a traffic data provider; the atlas remains fully interactive without it.');
    doc.getElementById('vtgMeasure').onclick = () => {
      measure = !measure;
      status(measure ? 'Measure mode: click two points on the map (or two port/airport markers) to see distance and estimated transit time.' : 'Measure mode closed.');
      if (measure) {
        const handler = e => {
          points.push([e.lngLat.lng, e.lngLat.lat]);
          if (points.length === 2) {
            const R = 6371, rad = x => x * Math.PI / 180;
            const a = rad(points[0][1]), b = rad(points[1][1]), c = rad(points[1][0] - points[0][0]), d = rad(points[1][1] - points[0][1]);
            const h = Math.sin(d / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(c / 2) ** 2;
            const km = 2 * R * Math.asin(Math.sqrt(h));
            // Typical average speeds — sea freight (~24 knots incl. port time) and
            // commercial/cargo air freight (~800 km/h incl. handling). These are
            // planning estimates, not a live carrier schedule.
            const seaHours = km / 44.4, airHours = (km / 800) + 6;
            const fmtTime = h => h < 24 ? `${Math.round(h)} hrs` : `${(h / 24).toFixed(1)} days`;
            status(`Distance: ${km.toFixed(0)} km • Estimated sea freight: ${fmtTime(seaHours)} • Estimated air freight: ${fmtTime(airHours)} (planning estimates, not a live schedule)`);
            points = []; measure = false;
          }
        };
        map.once('click', handler);
      }
    };
    map.on('load', () => { map.resize(); status('World atlas ready • search, zoom, rotate, fullscreen and explore.') });
    window.addEventListener('resize', () => map.resize());
  }

  // Exposed so frontend-v3.html can lazy-load this script and initialize the
  // map only when the map drawer is actually opened, instead of eagerly on
  // every page load.
  window.VTGInitMap = () => run(document);
})();
