(() => {
  /*
   * VTG Trade Atlas — premium rebuild
   * Replaces the previous Atlas presentation while keeping its launcher/API contract.
   * Location data comes from /api/atlas/locations.
   */
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js';
  const DAY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const NIGHT_STYLE = 'https://tiles.openfreemap.org/styles/dark';
  const BLUE_MARBLE = {
    version: 8,
    sources: {
      earth: {
        type: 'raster',
        tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/500m/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
        tileSize: 256,
        maxzoom: 8,
        attribution: 'Imagery © NASA EOSDIS GIBS / Blue Marble'
      }
    },
    layers: [{ id: 'earth', type: 'raster', source: 'earth',
      paint: { 'raster-brightness-min': 0.02, 'raster-brightness-max': 0.58, 'raster-saturation': -0.08 } }]
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs = (doc, s) => doc.querySelector(s);
  const qsa = (doc, s) => Array.from(doc.querySelectorAll(s));

  function themeIsDark(doc) {
    return doc.documentElement.getAttribute('data-theme') === 'dark' ||
      doc.body?.classList.contains('dark') ||
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }

  function imageSearchUrl(name, city, country) {
    const q = encodeURIComponent((name + ' ' + city + ' ' + country).trim());
    return 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      q + '&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1000&format=json&origin=*';
  }

  async function getLocationImage(location) {
    try {
      const r = await fetch(imageSearchUrl(location.name, location.city, location.country), { headers: { Accept: 'application/json' } });
      const d = await r.json();
      const pages = Object.values(d?.query?.pages || {});
      const usable = pages.find(p => p.imageinfo?.[0]?.thumburl) || pages.find(p => p.imageinfo?.[0]?.url);
      return usable?.imageinfo?.[0]?.thumburl || usable?.imageinfo?.[0]?.url || '';
    } catch (_) { return ''; }
  }

  function run(doc) {
    if (!doc || doc.getElementById('vtgAtlasPremiumStyle')) return;
    const drawer = doc.getElementById('mapDrawer');
    if (!drawer) return;

    const style = doc.createElement('style');
    style.id = 'vtgAtlasPremiumStyle';
    style.textContent = `
      #mapDrawer{background:#05080c!important}
      #mapDrawer .drawerPanel{position:relative!important;width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;padding:0!important;border-radius:0!important;background:#05080c!important;color:#f7f0df!important;overflow:hidden!important}
      #mapDrawer .atlasX{position:absolute;right:22px;top:18px;z-index:40;width:44px;height:44px;border:1px solid rgba(244,210,129,.32);border-radius:14px;background:rgba(7,10,15,.72);backdrop-filter:blur(18px);color:#f5d38b;font-size:24px;cursor:pointer;box-shadow:0 10px 35px rgba(0,0,0,.3)}
      #mapDrawer .atlasCanvas{position:absolute;inset:0}
      #mapDrawer #vtgPremiumMap{position:absolute;inset:0}
      #mapDrawer .mapWash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 48% 48%,transparent 0,rgba(2,5,9,.08) 42%,rgba(2,5,9,.72) 100%);z-index:2}
      #mapDrawer .atlasTop{position:absolute;left:24px;right:82px;top:18px;z-index:20;display:flex;align-items:center;gap:14px;pointer-events:none}
      #mapDrawer .atlasBrand{pointer-events:auto;display:flex;align-items:center;gap:11px;padding:9px 13px;border:1px solid rgba(244,210,129,.22);border-radius:16px;background:rgba(5,9,14,.66);backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.28)}
      #mapDrawer .atlasBrandMark{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:#d71920;color:#fff;font-weight:900}
      #mapDrawer .atlasBrand strong{font-size:12px;letter-spacing:.12em;text-transform:uppercase}
      #mapDrawer .atlasBrand small{display:block;color:#aeb8c1;font-size:8px;margin-top:2px}
      #mapDrawer .atlasSearch{pointer-events:auto;flex:1;max-width:540px;height:48px;display:flex;align-items:center;gap:8px;padding:0 14px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(5,9,14,.66);backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.28)}
      #mapDrawer .atlasSearch input{flex:1;border:0;outline:0;background:transparent;color:#fff;font:600 11px Manrope,system-ui}
      #mapDrawer .atlasSearch input::placeholder{color:#8c9aa5}
      #mapDrawer .atlasSearch button{border:0;border-radius:10px;background:#d71920;color:#fff;padding:8px 11px;font-size:9px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasChips{pointer-events:auto;display:flex;gap:7px;flex-wrap:wrap}
      #mapDrawer .atlasChip.shipments{border-color:rgba(224,92,76,.45);color:#ffd5cf}
      #mapDrawer .atlasChip.shipments.active{background:rgba(224,92,76,.18);border-color:#e05c4c;color:#fff}
      #mapDrawer .atlasChip{border:1px solid rgba(255,255,255,.15);background:rgba(5,9,14,.62);color:#dce4ea;border-radius:999px;padding:8px 11px;font-size:8px;font-weight:800;backdrop-filter:blur(14px);cursor:pointer}
      #mapDrawer .atlasChip.active{background:rgba(215,25,32,.18);border-color:rgba(215,25,32,.72);color:#ffb5b8}
      #mapDrawer .atlasLegend{position:absolute;left:24px;bottom:22px;z-index:15;display:flex;gap:8px;align-items:center;padding:9px 12px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(5,9,14,.68);backdrop-filter:blur(18px);font-size:8px;color:#aeb8c1}
      #mapDrawer .legendDot{width:8px;height:8px;border-radius:50%;display:inline-block;box-shadow:0 0 12px currentColor}
      #mapDrawer .legendDot.port{background:#f0c66b;color:#f0c66b}
      #mapDrawer .legendDot.air{background:#66d7df;color:#66d7df}
      #mapDrawer .atlasControls{position:absolute;right:22px;bottom:22px;z-index:15;display:grid;gap:7px}
      #mapDrawer .atlasControl{width:42px;height:42px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:rgba(5,9,14,.7);backdrop-filter:blur(16px);color:#e8edf0;font-weight:900;cursor:pointer}
      #mapDrawer .atlasControl:hover{border-color:#d71920;color:#ffb5b8}
      #mapDrawer .atlasMode{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:15;display:flex;padding:4px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:rgba(5,9,14,.72);backdrop-filter:blur(18px)}
      #mapDrawer .atlasMode button{border:0;background:transparent;color:#8f9da7;padding:8px 11px;border-radius:10px;font-size:8px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasMode button.active{background:rgba(215,25,32,.17);color:#ffb5b8}
      #mapDrawer .atlasInfo{position:absolute;right:24px;top:82px;z-index:30;width:min(410px,calc(100vw - 48px));max-height:calc(100vh - 124px);overflow:auto;border:1px solid rgba(244,210,129,.25);border-radius:24px;background:rgba(7,11,17,.86);backdrop-filter:blur(24px);box-shadow:0 25px 80px rgba(0,0,0,.48);transform:translateX(110%);opacity:0;transition:.38s cubic-bezier(.2,.8,.2,1)}
      #mapDrawer .atlasInfo.open{transform:translateX(0);opacity:1}
      #mapDrawer .atlasHero{height:190px;position:relative;overflow:hidden;border-radius:23px 23px 0 0;background:linear-gradient(135deg,#111c26,#05080c)}
      #mapDrawer .atlasHero img{width:100%;height:100%;object-fit:cover;display:block;opacity:.78}
      #mapDrawer .atlasHero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(4,7,11,.92))}
      #mapDrawer .atlasHeroText{position:absolute;left:18px;right:18px;bottom:16px;z-index:2}
      #mapDrawer .atlasType{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(215,25,32,.5);background:rgba(5,9,14,.58);color:#ffb5b8;border-radius:999px;padding:5px 8px;font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      #mapDrawer .atlasHero h2{margin:7px 0 2px;font-size:25px;line-height:1.05;color:#fff;letter-spacing:-.03em}
      #mapDrawer .atlasHero p{margin:0;color:#bdc8cf;font-size:9px}
      #mapDrawer .atlasInfoBody{padding:16px 18px 20px}
      #mapDrawer .atlasInfoClose{position:absolute;right:12px;top:12px;z-index:5;width:34px;height:34px;border:1px solid rgba(255,255,255,.18);border-radius:11px;background:rgba(0,0,0,.45);color:#fff;cursor:pointer}
      #mapDrawer .atlasStats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:13px}
      #mapDrawer .atlasStat{padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035)}
      #mapDrawer .atlasStat small{display:block;color:#7f8e99;font-size:7px;text-transform:uppercase;letter-spacing:.08em}
      #mapDrawer .atlasStat b{display:block;margin-top:4px;color:#eef3f5;font-size:10px}
      #mapDrawer .atlasSectionTitle{font-size:8px;text-transform:uppercase;letter-spacing:.13em;color:#e05c63;font-weight:900;margin:14px 0 7px}
      #mapDrawer .atlasDescription{font-size:10px;line-height:1.6;color:#b7c3ca}
      #mapDrawer .atlasTimeline{display:grid;gap:0;margin-top:6px}
      #mapDrawer .atlasStep{position:relative;display:grid;grid-template-columns:18px 1fr;gap:9px;padding:0 0 13px}
      #mapDrawer .atlasStep:not(:last-child):before{content:"";position:absolute;left:8px;top:16px;bottom:0;width:1px;background:rgba(255,255,255,.13)}
      #mapDrawer .atlasStepDot{width:17px;height:17px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:#10161c;z-index:2;box-shadow:0 0 0 3px rgba(255,255,255,.025)}
      #mapDrawer .atlasStep.done .atlasStepDot{background:#d71920;border-color:#d71920}
      #mapDrawer .atlasStep.active .atlasStepDot{background:#e05c4c;border-color:#ffb5b8;box-shadow:0 0 0 4px rgba(224,92,76,.14),0 0 16px rgba(224,92,76,.35)}
      #mapDrawer .atlasStep b{display:block;color:#eef3f5;font-size:9px}
      #mapDrawer .atlasStep small{display:block;color:#8997a1;font-size:7px;margin-top:3px;line-height:1.45}
      #mapDrawer .atlasActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:15px}
      #mapDrawer .atlasAction{padding:10px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#dfe7eb;font-size:8px;font-weight:900;cursor:pointer}
      #mapDrawer .atlasAction.primary{background:#d71920;border-color:#d71920;color:#fff}
      #mapDrawer .atlasImageCredit{margin-top:9px;color:#71808a;font-size:7px}
      #mapDrawer .atlasMarker{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.55);box-shadow:0 0 0 5px rgba(255,255,255,.04),0 0 24px currentColor;cursor:pointer;transform:translate(-50%,-50%);font-size:13px}
      #mapDrawer .atlasMarker.port{background:rgba(215,25,32,.94);color:#fff}
      #mapDrawer .atlasMarker.air{background:rgba(46,180,193,.92);color:#b8fbff}
      #mapDrawer .atlasMarker.selected{box-shadow:0 0 0 7px rgba(245,211,139,.15),0 0 34px currentColor;transform:translate(-50%,-50%) scale(1.18)}
      #mapDrawer .atlasMarker .pulse{position:absolute;inset:-7px;border:1px solid currentColor;border-radius:50%;opacity:.4;animation:vtgPulse 2.2s infinite}
      @keyframes vtgPulse{0%{transform:scale(.7);opacity:.6}75%,100%{transform:scale(1.5);opacity:0}}
      #mapDrawer .atlasCount{position:absolute;right:24px;top:82px;z-index:10;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,9,14,.65);color:#aeb8c1;font-size:7px;backdrop-filter:blur(15px)}
      #mapDrawer .atlasLoading{padding:35px;text-align:center;color:#9eabb4;font-size:9px}
      #mapDrawer .atlasLive{position:absolute;left:24px;top:86px;z-index:16;display:flex;gap:7px;align-items:center;padding:8px 11px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,9,14,.68);backdrop-filter:blur(18px);color:#b9c5ce;font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      #mapDrawer .atlasLive i{width:7px;height:7px;border-radius:50%;background:#e05c4c;box-shadow:0 0 12px #e05c4c;animation:vtgLive 1.6s infinite}
      #mapDrawer .atlasWeather{position:absolute;right:24px;bottom:22px;z-index:16;width:155px;padding:11px 12px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(5,9,14,.68);backdrop-filter:blur(18px);color:#dce4ea;font-size:8px;box-shadow:0 12px 40px rgba(0,0,0,.22)}
      #mapDrawer .atlasWeather b{display:block;font-size:10px;color:#fff;margin-bottom:3px}
      #mapDrawer .atlasWeather small{color:#8f9da7}
      @keyframes vtgLive{50%{opacity:.35;transform:scale(.75)}}
      #mapDrawer .atlasEmpty{padding:24px;color:#9eabb4;font-size:9px}
      @media(max-width:1000px){#mapDrawer .atlasChips{display:none}#mapDrawer .atlasTop{left:14px;right:70px}#mapDrawer .atlasInfo{right:14px;top:auto;bottom:14px;max-height:64vh;width:min(430px,calc(100vw - 28px))}#mapDrawer .atlasLegend{left:14px;bottom:78px}#mapDrawer .atlasMode{bottom:14px}}
      @media(max-width:620px){#mapDrawer .atlasBrand{display:none}#mapDrawer .atlasSearch{max-width:none}#mapDrawer .atlasSearch button{padding:8px}#mapDrawer .atlasInfo{max-height:68vh}.atlasHero{height:150px!important}#mapDrawer .atlasStats{grid-template-columns:1fr 1fr}#mapDrawer .atlasMode button{padding:8px 7px}}
    `;
    doc.head.appendChild(style);

    drawer.innerHTML = `
      <div class="drawerPanel">
        <button class="atlasX" id="vtgAtlasClose" aria-label="Close Trade Atlas">×</button>
        <div class="atlasCanvas">
          <div id="vtgPremiumMap"></div>
          <div class="mapWash"></div>
          <div class="atlasTop">
            <div class="atlasBrand"><div class="atlasBrandMark">V</div><div><strong>VTG Trade Atlas</strong><small>Global trade intelligence • Africa · China · South Korea</small></div></div>
            <div class="atlasSearch"><span style="color:#d5a74f">⌕</span><input id="vtgAtlasSearch" placeholder="Search a port, airport, city or country"><button id="vtgAtlasFind">SEARCH</button></div>
            <div class="atlasChips">
              <button class="atlasChip active" data-filter="all">All</button>
              <button class="atlasChip" data-filter="seaport">Seaports</button>
              <button class="atlasChip" data-filter="airport">Airports</button><button class="atlasChip shipments" id="atlasShipmentsToggle">Shipments</button>
              <button class="atlasChip" data-region="Africa">Africa</button>
              <button class="atlasChip" data-region="China">China</button>
              <button class="atlasChip" data-region="Korea">South Korea</button>
            </div>
          </div>
          <div class="atlasLive"><i></i> LIVE TRADE ATLAS</div>
          <div class="atlasCount" id="vtgAtlasCount">Loading locations…</div>
          <div class="atlasWeather"><b id="atlasWeatherTitle">Trade conditions</b><small id="atlasWeatherText">Monitoring global trade corridors and shipment activity</small></div>
          <div class="atlasInfo" id="vtgAtlasInfo"></div>
          <div class="atlasLegend"><span class="legendDot port"></span> Seaport <span style="margin-left:7px" class="legendDot air"></span> Airport <span style="margin-left:8px">Click any location for details</span></div>
          <div class="atlasMode">
            <button class="active" data-mapmode="night">Night</button>
            <button data-mapmode="day">Day</button>
            <button data-mapmode="dark">Dark</button>
            <button data-mapmode="satellite">Earth</button>
          </div>
          <div class="atlasControls">
            <button class="atlasControl" id="atlasPlus">+</button>
            <button class="atlasControl" id="atlasMinus">−</button>
            <button class="atlasControl" id="atlasReset">◎</button>
            <button class="atlasControl" id="atlasCompass">N</button>
          </div>
        </div>
      </div>`;

    qs(doc, '#vtgAtlasClose').onclick = () => { drawer.classList.remove('open'); doc.body.style.overflow=''; };
    if (!doc.querySelector('script[data-vtg-atlas-maplibre]')) {
      const s = doc.createElement('script');
      s.src = MAPLIBRE; s.dataset.vtgAtlasMaplibre='1'; doc.head.appendChild(s);
      s.onload = () => init(doc);
    } else init(doc);
  }

  async function init(doc) {
    const ml = window.maplibregl;
    if (!ml) return setTimeout(() => init(doc), 120);
    const map = new ml.Map({
      container: doc.getElementById('vtgPremiumMap'),
      style: themeIsDark(doc) ? NIGHT_STYLE : BLUE_MARBLE,
      center: [50, 13],
      zoom: 1.75,
      projection: { type: 'globe' },
      attributionControl: false,
      pitch: 12
    });
    map.addControl(new ml.NavigationControl({showCompass:false,showZoom:false}), 'bottom-right');
    const locations = [];
    const markers = [];
    let shipments = [];
    let shipmentRoutesVisible = false;
    let filterType='all', filterRegion='all', mapMode=themeIsDark(doc)?'dark':'night';

    function addCorridorLayer() {
      if (map.getSource('vtg-atlas-corridors')) return;
      map.addSource('vtg-atlas-corridors',{type:'geojson',data:{type:'FeatureCollection',features:[
        {type:'Feature',properties:{name:'Africa–China'},geometry:{type:'LineString',coordinates:[[3.38,6.45],[18,7],[35,12],[51,22],[103.85,1.29],[113.26,23.13]]}},
        {type:'Feature',properties:{name:'Africa–South Korea'},geometry:{type:'LineString',coordinates:[[3.38,6.45],[28,8],[57,20],[90,30],[126.98,37.46]]}}
      ]}});
      map.addLayer({id:'vtg-atlas-corridor-glow',type:'line',source:'vtg-atlas-corridors',paint:{'line-color':'#d71920','line-width':5,'line-opacity':.12,'line-blur':2}});
      map.addLayer({id:'vtg-atlas-corridors',type:'line',source:'vtg-atlas-corridors',paint:{'line-color':'#e05c63','line-width':1.5,'line-opacity':.42,'line-dasharray':[3,2]}});
    }

    function clearShipmentLayer() {
      if (map.getLayer('vtg-shipment-route')) map.removeLayer('vtg-shipment-route');
      if (map.getLayer('vtg-shipment-route-glow')) map.removeLayer('vtg-shipment-route-glow');
      if (map.getSource('vtg-shipment-routes')) map.removeSource('vtg-shipment-routes');
    }

    function renderShipmentRoutes() {
      clearShipmentLayer();
      if (!shipmentRoutesVisible || !shipments.length) return;
      const features=shipments.filter(s=>(s.routePoints||[]).length>=2).map(s=>({
        type:'Feature',
        properties:{shipmentId:s.id,reference:s.reference||'Shipment'},
        geometry:{type:'LineString',coordinates:s.routePoints.map(p=>[Number(p.lng),Number(p.lat)])}
      }));
      if(!features.length) return;
      map.addSource('vtg-shipment-routes',{type:'geojson',data:{type:'FeatureCollection',features}});
      map.addLayer({id:'vtg-shipment-route-glow',type:'line',source:'vtg-shipment-routes',paint:{'line-color':'#e05c4c','line-width':6,'line-opacity':.18,'line-blur':3}});
      map.addLayer({id:'vtg-shipment-route',type:'line',source:'vtg-shipment-routes',paint:{'line-color':'#e05c4c','line-width':2.4,'line-opacity':.9,'line-dasharray':[2,1.3]}});
    }

    function shipmentLabel(status) {
      const labels = {
        pending:'Order / shipment pending', shipped:'Shipment departed', in_transit:'In transit',
        arrived:'Arrived at destination', delivered:'Delivered', cancelled:'Cancelled', attention:'Attention required'
      };
      return labels[status] || String(status || 'pending').replace(/_/g,' ');
    }

    function shipmentMilestoneRows(s) {
      const events = Array.isArray(s.milestones) ? s.milestones : [];
      const rows = events.map(e => ({
        label: e.location || 'Shipment milestone',
        detail: e.detail || (e.status === 'done' ? 'Completed' : e.status === 'active' ? 'Current operational point' : 'Pending'),
        status: e.status || 'pending',
        time: e.eventTime ? new Date(e.eventTime).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) : ''
      }));
      if (s.customs?.status && s.customs.status !== 'not_started') {
        rows.push({
          label: 'Customs clearance',
          detail: 'Status: ' + String(s.customs.status).replace(/_/g,' '),
          status: ['cleared','released'].includes(s.customs.status) ? 'done' : 'active',
          time: s.customs.clearedAt ? new Date(s.customs.clearedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) : ''
        });
      }
      rows.push({
        label:'Final delivery',
        detail:s.status==='delivered'?'Delivery completed':'Awaiting clearance / delivery confirmation',
        status:s.status==='delivered'?'done':'pending',
        time:''
      });
      return rows;
    }

    async function selectShipment(s) {
      const panel=qs(doc,'#vtgAtlasInfo');
      panel.classList.add('open');
      panel.innerHTML='<div class="atlasHero"><div class="atlasLoading">Loading shipment intelligence…</div><button class="atlasInfoClose" id="atlasInfoClose">×</button></div><div class="atlasInfoBody"><div class="atlasLoading">Loading shipment details…</div></div>';
      qs(doc,'#atlasInfoClose').onclick=()=>panel.classList.remove('open');
      const p=s.journey?.current || s.routePoints?.[0];
      if(p) map.flyTo({center:[Number(p.lng),Number(p.lat)],zoom:5.2,duration:1000});
      const vessel=s.vessel||{};
      const customs=s.customs||{};
      const rows=shipmentMilestoneRows(s);
      const status=shipmentLabel(s.status);
      panel.innerHTML=`
        <div class="atlasHero">
          <div style="height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(215,25,32,.35),transparent 55%);font-size:54px">🚢</div>
          <div class="atlasHeroText"><span class="atlasType">🚢 Shipment • ${esc(status)}</span><h2>${esc(s.reference||'Shipment')}</h2><p>${esc(s.originPort||'Origin')} → ${esc(s.destinationPort||'Destination')}</p></div>
          <button class="atlasInfoClose" id="atlasInfoClose">×</button>
        </div>
        <div class="atlasInfoBody">
          <div class="atlasStats">
            <div class="atlasStat"><small>Progress</small><b>${esc(String(s.percentComplete ?? 0))}%</b></div>
            <div class="atlasStat"><small>Vessel</small><b>${esc(vessel.name||'Not assigned')}</b></div>
            <div class="atlasStat"><small>Customs</small><b>${esc(String(customs.status||'not_started').replace(/_/g,' '))}</b></div>
          </div>
          <div class="atlasSectionTitle">Order → shipment → vessel → port → customs → buyer</div>
          <div class="atlasDescription">
            <b style="color:#eef3f5">${esc(s.reference||'Order')}</b> • Shipment ${esc(String(s.id).slice(0,8))}<br>
            ${vessel.name ? 'Vessel: '+esc(vessel.name)+(vessel.imo?' • IMO '+esc(vessel.imo):'')+'<br>' : ''}
            ${esc(s.originPort||'Origin not recorded')} → ${esc(s.destinationPort||'Destination not recorded')}
          </div>
          <div class="atlasSectionTitle">Operational timeline</div>
          <div class="atlasTimeline">${rows.map(r=>'<div class="atlasStep '+esc(r.status)+'"><span class="atlasStepDot"></span><div><b>'+esc(r.label)+'</b><small>'+esc(r.detail)+(r.time?' • '+esc(r.time):'')+'</small></div></div>').join('')}</div>
          <div class="atlasSectionTitle">Trade parties</div>
          <div class="atlasDescription">${s.buyerName?'Buyer: '+esc(s.buyerName)+'<br>':''}${s.supplierName?'Supplier: '+esc(s.supplierName):'Supplier details restricted by access role.'}</div>
          <div class="atlasSectionTitle">Customs & clearance</div>
          <div class="atlasDescription">${esc(String(customs.status||'not_started').replace(/_/g,' '))}${customs.authority?' • '+esc(customs.authority):''}${customs.declarationRef?' • Declaration '+esc(customs.declarationRef):''}</div>
          <div class="atlasActions"><button class="atlasAction primary" id="atlasOpenShipment">Open shipment</button><button class="atlasAction" id="atlasOpenOrder">Open order</button></div>
        </div>`;
      qs(doc,'#atlasInfoClose').onclick=()=>panel.classList.remove('open');
      qs(doc,'#atlasOpenShipment').onclick=()=>{ window.location.href='/trade-os.html?shipment='+encodeURIComponent(s.id); };
      qs(doc,'#atlasOpenOrder').onclick=()=>{ window.location.href='/trade-os.html?order='+encodeURIComponent(s.orderId); };
    }

    async function loadShipments() {
      try {
        const r=await fetch('/api/shipments/atlas',{headers:{Accept:'application/json'}});
        if(!r.ok) return;
        const d=await r.json();
        shipments=Array.isArray(d.shipments)?d.shipments:[];
        renderShipmentRoutes();
      } catch (_) {}
    }

    const applyRasterMood = () => {
      if (map.getLayer('earth')) {
        map.setPaintProperty('earth','raster-brightness-max', mapMode==='satellite'?1:mapMode==='day'?1:0.58);
        map.setPaintProperty('earth','raster-saturation', mapMode==='satellite'?0:mapMode==='day'?-0.02:-0.2);
      }
    };

    function clearMarkers() { markers.splice(0).forEach(m => m.remove()); }

    function visible() {
      const q = (qs(doc,'#vtgAtlasSearch')?.value || '').trim().toLowerCase();
      return locations.filter(x =>
        (filterType==='all'||x.type===filterType) &&
        (filterRegion==='all'||x.region===filterRegion) &&
        (!q || `${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase().includes(q))
      );
    }

    function markerFor(x) {
      const el=doc.createElement('button');
      el.className='atlasMarker '+(x.type==='airport'?'air':'port');
      el.title=x.name;
      el.innerHTML=(x.type==='airport'?'✈':'⚓')+'<span class="pulse"></span>';
      el.onclick=e=>{e.stopPropagation(); selectLocation(x)};
      return new ml.Marker({element:el,anchor:'center'}).setLngLat([x.lng,x.lat]).addTo(map);
    }

    function renderMarkers() {
      clearMarkers();
      const v=visible();
      v.forEach(x=>markers.push(markerFor(x)));
      qs(doc,'#vtgAtlasCount').textContent=v.length+' locations • '+(v.filter(x=>x.type==='seaport').length)+' seaports • '+(v.filter(x=>x.type==='airport').length)+' airports';
    }

    async function selectLocation(x) {
      markers.forEach(m=>m.getElement().classList.remove('selected'));
      const found=markers.find(m=>Math.abs(m.getLngLat().lng-x.lng)<.0001&&Math.abs(m.getLngLat().lat-x.lat)<.0001);
      found?.getElement().classList.add('selected');
      map.flyTo({center:[x.lng,x.lat],zoom:7.2,duration:1200});
      const panel=qs(doc,'#vtgAtlasInfo');
      panel.classList.add('open');
      panel.innerHTML='<div class="atlasHero"><div class="atlasLoading">Loading location imagery…</div><button class="atlasInfoClose" id="atlasInfoClose">×</button></div><div class="atlasInfoBody"><div class="atlasLoading">Loading location intelligence…</div></div>';
      qs(doc,'#atlasInfoClose').onclick=()=>panel.classList.remove('open');

      const image=await getLocationImage(x);
      const description=x.type==='seaport'
        ? `${x.name} is a strategic maritime gateway serving ${x.city}, ${x.country}. VTG Atlas identifies it as a seaport for trade-route discovery, shipment planning and port-to-port logistics.`
        : `${x.name} is an international air gateway serving ${x.city}, ${x.country}. VTG Atlas identifies it as an airport for air-cargo planning, trade connectivity and time-sensitive movement.`;
      const regionLabel=x.region==='Korea'?'South Korea':x.region;
      panel.innerHTML=`
        <div class="atlasHero">
          ${image?'<img src="'+esc(image)+'" alt="'+esc(x.name)+'">':'<div style="height:100%;display:grid;place-items:center;color:#d5a74f;font-size:44px">'+(x.type==='airport'?'✈':'⚓')+'</div>'}
          <div class="atlasHeroText"><span class="atlasType">${x.type==='airport'?'✈ Airport':'⚓ Seaport'} • ${esc(regionLabel)}</span><h2>${esc(x.name)}</h2><p>${esc(x.city)}, ${esc(x.country)} • ${esc(x.code)}</p></div>
          <button class="atlasInfoClose" id="atlasInfoClose">×</button>
        </div>
        <div class="atlasInfoBody">
          <div class="atlasStats">
            <div class="atlasStat"><small>Country</small><b>${esc(x.country)}</b></div>
            <div class="atlasStat"><small>City</small><b>${esc(x.city)}</b></div>
            <div class="atlasStat"><small>Code</small><b>${esc(x.code)}</b></div>
          </div>
          <div class="atlasSectionTitle">Location intelligence</div>
          <div class="atlasDescription">${esc(description)}</div>
          <div class="atlasSectionTitle">Coordinates</div>
          <div class="atlasDescription">${Number(x.lat).toFixed(4)}° ${Number(x.lat)>=0?'N':'S'} • ${Math.abs(Number(x.lng)).toFixed(4)}° ${Number(x.lng)>=0?'E':'W'}</div>
          <div class="atlasSectionTitle">VTG trade context</div>
          <div class="atlasDescription">${x.region==='Africa'?'African trade gateway connecting regional markets with global suppliers and buyers.':x.region==='China'?'Chinese production and export gateway with direct relevance to Africa–Asia trade corridors.':'South Korean trade gateway supporting advanced manufacturing, maritime and air-cargo connectivity.'}</div>
          <div class="atlasActions"><button class="atlasAction primary" id="atlasRoute">Explore routes</button><button class="atlasAction" id="atlasZoom">Zoom location</button></div>
          <div class="atlasImageCredit">${image?'Location image supplied through Wikimedia Commons search.':'No suitable public location image was returned; VTG location data remains available.'}</div>
        </div>`;
      qs(doc,'#atlasInfoClose').onclick=()=>panel.classList.remove('open');
      qs(doc,'#atlasZoom').onclick=()=>map.flyTo({center:[x.lng,x.lat],zoom:11,duration:1000});
      qs(doc,'#atlasRoute').onclick=()=>showRoutes(x);
    }

    async function showRoutes(x) {
      const panel=qs(doc,'#vtgAtlasInfo');
      const body=panel.querySelector('.atlasInfoBody');
      if(!body) return;
      body.insertAdjacentHTML('beforeend','<div class="atlasSectionTitle">Connected VTG corridors</div><div id="atlasRoutesText" class="atlasDescription">Loading trade corridors…</div>');
      try {
        const r=await fetch('/api/atlas/corridors');
        const d=await r.json();
        const rows=(d.data||[]).filter(c=>(c.from+' '+c.to+' '+c.name).toLowerCase().includes(x.city.toLowerCase()) || (c.from+' '+c.to+' '+c.name).toLowerCase().includes(x.name.toLowerCase()));
        qs(doc,'#atlasRoutesText').innerHTML=rows.length?rows.slice(0,6).map(c=>'<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><b style="color:#eef3f5">'+esc(c.name)+'</b><br><small>'+esc(c.mode)+' • '+esc(c.from)+' → '+esc(c.to)+'</small></div>').join(''):'No named VTG corridor is currently registered for this location.';
      } catch (_) { qs(doc,'#atlasRoutesText').textContent='Route intelligence is temporarily unavailable.'; }
    }

    async function loadLocations() {
      try {
        const r=await fetch('/api/atlas/locations');
        const d=await r.json();
        locations.push(...(d.data||[]));
        renderMarkers();
      } catch (_) {
        qs(doc,'#vtgAtlasCount').textContent='Location database unavailable';
      }
    }

    qsa(doc,'.atlasChip').forEach(b=>b.onclick=()=>{
      qsa(doc,'.atlasChip').forEach(x=>x.classList.remove('active')); b.classList.add('active');
      if(b.dataset.filter) filterType=b.dataset.filter;
      if(b.dataset.region) {filterRegion=b.dataset.region; filterType='all';}
      if(b.dataset.filter==='all') filterRegion='all';
      renderMarkers();
    });
    qs(doc,'#atlasShipmentsToggle').onclick=()=>{
      shipmentRoutesVisible=!shipmentRoutesVisible;
      qs(doc,'#atlasShipmentsToggle').classList.toggle('active',shipmentRoutesVisible);
      renderShipmentRoutes();
    };
    qs(doc,'#vtgAtlasFind').onclick=()=>renderMarkers();
    qs(doc,'#vtgAtlasSearch').onkeydown=e=>{if(e.key==='Enter')renderMarkers()};
    qs(doc,'#atlasPlus').onclick=()=>map.zoomIn();
    qs(doc,'#atlasMinus').onclick=()=>map.zoomOut();
    qs(doc,'#atlasReset').onclick=()=>map.flyTo({center:[50,13],zoom:1.75,duration:900});
    qs(doc,'#atlasCompass').onclick=()=>map.resetNorthPitch();

    function setMode(mode) {
      mapMode=mode;
      qsa(doc,'[data-mapmode]').forEach(b=>b.classList.toggle('active',b.dataset.mapmode===mode));
      const target=mode==='day'?DAY_STYLE:(mode==='dark'?NIGHT_STYLE:mode==='satellite'?BLUE_MARBLE:NIGHT_STYLE);
      map.setStyle(target);
      map.once('styledata',()=>{addCorridorLayer();applyRasterMood();renderShipmentRoutes();});
    }
    qsa(doc,'[data-mapmode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mapmode));

    const observer=new MutationObserver(()=>{if(themeIsDark(doc)&&mapMode==='day')setMode('dark');});
    observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-theme','class']});

    loadLocations();
    loadShipments();
    const wt=qs(doc,'#atlasWeatherText');
    const wh=qs(doc,'#atlasWeatherTitle');
    if (wt && wh) {
      const hour=new Date().getUTCHours();
      wh.textContent=hour>=6&&hour<18?'Global trade network':'Trade network • night view';
      wt.textContent='Africa ↔ China ↔ South Korea • shipments, ports and corridors';
    }
    map.on('click','vtg-shipment-route',(e)=>{
      const id=e.features?.[0]?.properties?.shipmentId;
      const shipment=shipments.find(s=>String(s.id)===String(id));
      if(shipment) selectShipment(shipment);
    });
    map.on('mouseenter','vtg-shipment-route',()=>{map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave','vtg-shipment-route',()=>{map.getCanvas().style.cursor='';});
    map.on('load',()=>{addCorridorLayer();applyRasterMood();renderShipmentRoutes();});
  }

  window.VTGInitMap = () => {
    const doc=document;
    if (doc.getElementById('vtgPremiumMap')) return;
    run(doc);
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>window.VTGInitMap(),{once:true});
  else window.VTGInitMap();
})();