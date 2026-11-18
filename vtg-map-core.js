/* VTG shared map core — used by the Trade Atlas, the dashboard shipment maps and the workspace Atlas drawer.
 *
 * No API keys are ever needed:
 *  - Leaflet is served from this site (/vendor/leaflet), with the public CDNs only as a backup.
 *  - Street tiles come from key-free public providers, tried in order:
 *      OpenStreetMap  ->  CARTO (OpenStreetMap data)  ->  Esri World Street Map
 *  - A built-in vector world map (Natural Earth, public domain) is always drawn underneath, so the map
 *    shows continents, borders and every VTG marker even when a network blocks all tile services.
 */
(function(){
  'use strict';
  if(window.VTGMap)return;
  var BASE='/vendor/leaflet/';
  var GEO='/vendor/world-110m.geojson?v=1';
  var PROVIDERS=[
    {name:'OpenStreetMap',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',opt:{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}},
    {name:'CARTO',url:'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}{r}.png',opt:{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'}},
    {name:'Esri',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',opt:{maxZoom:19,attribution:'Tiles &copy; Esri'}}
  ];
  var COLORS={
    light:{ocean:'#cfe5f1',land:'#f4f0e4',line:'#b7c3cb'},
    dark:{ocean:'#0c2030',land:'#1b3446',line:'#38566b'}
  };
  function theme(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark'}

  function loadCss(url){
    return new Promise(function(res,rej){
      var cur=document.querySelector('link[data-vtg-leaflet-css]');
      if(cur){res();return}
      var l=document.createElement('link');l.rel='stylesheet';l.href=url;l.setAttribute('data-vtg-leaflet-css','1');
      l.onload=function(){res()};l.onerror=function(){l.remove();rej(Error('css'))};document.head.appendChild(l);
    });
  }
  function loadJs(url){
    return new Promise(function(res,rej){
      var s=document.createElement('script');s.src=url;
      s.onload=function(){window.L?res():rej(Error('Leaflet missing'))};s.onerror=function(){s.remove();rej(Error('js'))};
      document.head.appendChild(s);
    });
  }
  var leafletPromise=null;
  function ensureLeaflet(){
    if(window.L&&window.L.map)return Promise.resolve(window.L);
    if(leafletPromise)return leafletPromise;
    leafletPromise=loadCss(BASE+'leaflet.css').catch(function(){return loadCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css')})
      .then(function(){return loadJs(BASE+'leaflet.js')})
      .catch(function(){return loadJs('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js')})
      .then(function(){return window.L})
      .catch(function(e){leafletPromise=null;throw e});
    return leafletPromise;
  }

  var geoPromise=null;
  function loadWorld(){
    if(!geoPromise)geoPromise=fetch(GEO).then(function(r){if(!r.ok)throw Error('world');return r.json()}).catch(function(){geoPromise=null;return null});
    return geoPromise;
  }

  /* Adds the vector world + tile chain to a Leaflet map. Returns {setTheme,status}. */
  function basemap(L,map,opts){
    opts=opts||{};
    var node=map.getContainer();
    var state={tilesOk:false,idx:0,failed:0,layer:null,land:null};
    function paint(){
      var c=COLORS[theme()];
      node.style.background=c.ocean;
      if(state.land)state.land.setStyle({fillColor:c.land,color:c.line,weight:.7,fillOpacity:1});
    }
    // vector world, always present
    if(!map.getPane('vtgLand')){map.createPane('vtgLand');map.getPane('vtgLand').style.zIndex=190;map.getPane('vtgLand').style.pointerEvents='none';}
    loadWorld().then(function(g){
      if(!g)return;
      state.land=L.geoJSON(g,{pane:'vtgLand',interactive:false,style:{fillColor:COLORS[theme()].land,color:COLORS[theme()].line,weight:.7,fillOpacity:1}}).addTo(map);
      paint();
    });
    // friendly status line (never mentions keys)
    var note=document.createElement('div');
    note.setAttribute('role','status');
    note.style.cssText='position:absolute;z-index:1000;top:10px;left:50%;transform:translateX(-50%);max-width:calc(100% - 100px);padding:6px 10px;border-radius:9px;background:rgba(12,32,48,.82);color:#fff;font:600 11px Manrope,Arial,sans-serif;display:none;pointer-events:none';
    if(getComputedStyle(node).position==='static')node.style.position='relative';
    node.appendChild(note);
    function say(t){if(t){note.textContent=t;note.style.display='block'}else note.style.display='none'}

    function useProvider(i){
      if(state.layer){map.removeLayer(state.layer);state.layer=null}
      if(i>=PROVIDERS.length){
        say('Showing the VTG world map. Detailed street tiles are not reachable from this network.');
        return;
      }
      state.idx=i;state.failed=0;
      var p=PROVIDERS[i];
      var o=Object.assign({},p.opt);
      var url=p.url;
      if(p.name==='CARTO'){url=url.replace('{style}',theme()==='light'?'light_all':'dark_all')}
      var layer=L.tileLayer(url,o).addTo(map);
      layer.on('tileload',function(){state.tilesOk=true;state.failed=0;say('')});
      layer.on('tileerror',function(){
        state.failed++;
        if(!state.tilesOk&&state.failed>=3&&state.layer===layer)useProvider(i+1);
      });
      state.layer=layer;
    }
    useProvider(0);
    // a provider that worked once but stops (rate limit): try the next one
    var recovery=0;
    map.on('zoomend moveend',function(){recovery=0});
    function setTheme(){
      paint();
      if(state.layer&&PROVIDERS[state.idx].name==='CARTO'){useProvider(state.idx)}
    }
    document.addEventListener('vtg:themechange',setTheme);
    new MutationObserver(setTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    paint();
    return {setTheme:setTheme,status:say,state:state};
  }

  window.VTGMap={ensureLeaflet:ensureLeaflet,basemap:basemap,loadWorld:loadWorld,providers:PROVIDERS};
})();
