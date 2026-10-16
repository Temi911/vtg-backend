(()=>{
const DATA_URL='/vtg-trade-atlas.js?v=20261016-svg-atlas';
const css=`
#mapDrawer .drawerPanel{width:min(1120px,96vw)!important;height:min(94vh,900px)!important;top:3vh!important;border-radius:18px 0 0 18px!important;padding:16px!important;background:#f3f7f8;overflow:auto!important}
.vtgMapApp{color:#17384b;background:#fff;border:1px solid #dbe5e9;border-radius:16px;overflow:hidden}
.vtgMapHead{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:12px;border-bottom:1px solid #e2eaee}
.vtgMapHead input{flex:1;min-width:190px;height:40px;border:1px solid #cedde3;border-radius:10px;padding:0 12px;font:inherit;color:#17384b;background:#fff}
.vtgMapBtn{border:1px solid #cfdee4;background:#fff;color:#17384b;border-radius:9px;padding:9px 12px;font-weight:800;font-size:12px;cursor:pointer}
.vtgMapBtn.primary{background:#a82028;color:#fff;border-color:#a82028}
.vtgMapStage{position:relative;background:#dcebf0;min-height:420px;height:min(62vh,650px);overflow:hidden}
.vtgMapSvg{display:block;width:100%;height:100%;touch-action:none;cursor:grab}.vtgMapSvg:active{cursor:grabbing}
.vtgMapLayerPanel{position:absolute;left:12px;top:12px;z-index:2;width:205px;background:rgba(255,255,255,.96);border:1px solid #d1e0e5;border-radius:12px;padding:10px;box-shadow:0 6px 22px #143b5017}
.vtgMapLayerPanel strong{display:block;font-size:12px;margin:2px 4px 8px}.vtgMapLayer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 4px;font-size:11px;border-top:1px solid #edf2f4}
.vtgMapLayer input{accent-color:#a82028}.vtgMapTools{position:absolute;right:12px;top:12px;z-index:2;display:grid;gap:6px}
.vtgMapTools button{width:38px;height:38px;border:1px solid #d1e0e5;background:#fff;color:#17384b;border-radius:10px;font-size:17px;font-weight:800;cursor:pointer}
.vtgMapStatus{position:absolute;left:12px;bottom:12px;z-index:2;max-width:min(520px,calc(100% - 24px));padding:9px 12px;background:#102e40eF;color:#fff;border-radius:10px;font-size:11px}
.vtgMapLegend{display:flex;flex-wrap:wrap;gap:12px;padding:10px 12px;border-top:1px solid #e2eaee;color:#577080;font-size:11px}.vtgMapLegend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
.vtgMapFoot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#f8fafb;font-size:11px;color:#607786}
.vtgMapPopup{font:12px/1.5 Arial,sans-serif;fill:#17384b;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round;pointer-events:none}
.vtgMapPoint{cursor:pointer;stroke:#fff;stroke-width:1.6;vector-effect:non-scaling-stroke}.vtgMapPoint:hover{stroke:#102e40;stroke-width:3}
@media(max-width:650px){#mapDrawer .drawerPanel{width:98vw!important;height:96vh!important;top:2vh!important;padding:10px!important;border-radius:14px!important}.vtgMapStage{height:64vh;min-height:390px}.vtgMapLayerPanel{width:164px;left:7px;top:7px;padding:7px}.vtgMapLayer{font-size:10px;padding:6px 2px}.vtgMapTools{right:7px;top:7px}.vtgMapTools button{width:34px;height:34px}.vtgMapStatus{left:7px;bottom:7px;font-size:10px}}
`;
const land=[
[[-168,70],[-145,72],[-126,57],[-111,50],[-97,49],[-82,25],[-98,8],[-113,27],[-130,43],[-155,55]],
[[-82,12],[-68,10],[-49,-2],[-35,-10],[-51,-35],[-70,-56],[-80,-20]],
[[-18,36],[3,37],[31,31],[50,12],[43,-12],[30,-35],[17,-35],[5,-5],[-9,5],[-17,20]],
[[-11,71],[15,72],[42,57],[31,42],[15,36],[4,55]],
[[35,70],[66,76],[100,72],[130,58],[165,61],[178,48],[150,35],[130,8],[111,-7],[96,5],[80,22],[62,25],[46,42]],
[[112,-11],[154,-10],[153,-40],[130,-44],[114,-25]],
[[47,-13],[51,-16],[49,-26],[44,-22]],
[[-24,63],[-13,66],[-18,72],[-27,70]],
[[-180,-60],[180,-60],[180,-85],[-180,-85]]
];
const lonLat=(lon,lat)=>[(lon+180)/360*1200,(85-lat)/145*620];
const pathFor=coords=>coords.map((p,i)=>{const [x,y]=lonLat(p[0],p[1]);return (i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}).join(' ')+' Z';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function svgEl(tag,attrs,inner=''){return '<'+tag+' '+Object.entries(attrs).map(([k,v])=>k+'="'+String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"').join(' ')+'>'+inner+'</'+tag+'>'}
async function open(){
const drawer=document.getElementById('mapDrawer');if(!drawer)return;
if(!document.getElementById('vtgSvgAtlasCss')){const st=document.createElement('style');st.id='vtgSvgAtlasCss';st.textContent=css;document.head.appendChild(st)}
drawer.innerHTML=`<div class="drawerPanel"><div class="drawerTop"><div><div class="eyebrow">AFRICA · CHINA · SOUTH KOREA</div><h2>VTG Trade Atlas</h2><p style="font-size:12px;color:var(--muted);margin:4px 0 12px">Interactive trade map for ports, markets and logistics corridors.</p></div><button class="close" id="vtgSvgClose" aria-label="Close map">×</button></div><div class="vtgMapApp"><div class="vtgMapHead"><input id="vtgSvgSearch" placeholder="Search a country, port or trade hub (e.g. Tin Can Island)"><button class="vtgMapBtn primary" id="vtgSvgFind">Find location</button><button class="vtgMapBtn" id="vtgSvgWorld">Reset view</button></div><div class="vtgMapStage"><svg id="vtgSvgMap" class="vtgMapSvg" viewBox="0 0 1200 620" role="img" aria-label="Interactive VTG world trade map"></svg><div class="vtgMapLayerPanel"><strong>Map layers</strong><label class="vtgMapLayer">Countries <input type="checkbox" data-vlayer="countries" checked></label><label class="vtgMapLayer">Ports & terminals <input type="checkbox" data-vlayer="ports" checked></label><label class="vtgMapLayer">Trade hubs <input type="checkbox" data-vlayer="hubs" checked></label><label class="vtgMapLayer">Shipping corridors <input type="checkbox" data-vlayer="routes" checked></label></div><div class="vtgMapTools"><button id="vtgSvgPlus" aria-label="Zoom in">+</button><button id="vtgSvgMinus" aria-label="Zoom out">−</button><button id="vtgSvgHome" aria-label="Reset map">⌂</button></div><div id="vtgSvgStatus" class="vtgMapStatus">Loading VTG trade locations…</div></div><div class="vtgMapLegend"><span><i style="background:#078c91"></i>Country</span><span><i style="background:#e46b42"></i>Port / terminal</span><span><i style="background:#7754cf"></i>Trade hub</span><span><i style="background:#d5a33b"></i>Shipping corridor</span></div><div class="vtgMapFoot"><span id="vtgSvgCounts">Map runs locally in your browser; no map API key required.</span><span>Drag to pan · scroll or use + / − to zoom · select a marker for details</span></div></div></div>`;
const close=()=>{drawer.classList.remove('open');document.body.style.overflow=''};document.getElementById('vtgSvgClose').onclick=close;
const svg=document.getElementById('vtgSvgMap'),status=document.getElementById('vtgSvgStatus');
let D=null,zoom=1,cx=600,cy=310,drag=null;
function draw(){
if(!D)return;
const vbW=1200/zoom,vbH=620/zoom,x=cx-vbW/2,y=cy-vbH/2;svg.setAttribute('viewBox',`${x} ${y} ${vbW} ${vbH}`);
let out='<defs><linearGradient id="vtgSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dceef3"/><stop offset="1" stop-color="#b9d8e2"/></linearGradient><linearGradient id="vtgLand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2ead8"/><stop offset="1" stop-color="#d5d9c3"/></linearGradient></defs><rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#vtgSea)"/>';
for(let lon=-180;lon<=180;lon+=30){const [x1,y1]=lonLat(lon,-60),[x2,y2]=lonLat(lon,85);out+=svgEl('path',{d:`M${x1},${y1} L${x2},${y2}`,fill:'none',stroke:'#ffffff', 'stroke-width':1.2,opacity:.7})}
for(let lat=-60;lat<=80;lat+=20){const [x1,y1]=lonLat(-180,lat),[x2,y2]=lonLat(180,lat);out+=svgEl('path',{d:`M${x1},${y1} L${x2},${y2}`,fill:'none',stroke:'#ffffff','stroke-width':1.2,opacity:.7})}
out+='<g id="vtgLandShapes">'+land.slice(0,8).map(p=>svgEl('path',{d:pathFor(p),fill:'url(#vtgLand)',stroke:'#a7b9aa','stroke-width':1.5})).join('')+'</g>';
const enabled=k=>document.querySelector('[data-vlayer="'+k+'"]')?.checked;
if(enabled('routes'))for(const r of D.routes||[]){const pts=(r.coords||[]).map(p=>lonLat(p[0],p[1]));if(pts.length<2)continue;out+=svgEl('polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#d5a33b','stroke-width':2.2,'stroke-dasharray':'7 5',opacity:.82,'data-kind':'routes','data-name':r.name})}
const drawPoints=(items,k,color,rad)=>{if(!enabled(k))return '';return (items||[]).map(p=>{if(!Number.isFinite(+p.lat)||!Number.isFinite(+p.lon))return '';const [x,y]=lonLat(+p.lon,+p.lat);return '<g data-kind="'+k+'" data-name="'+esc(p.name)+'" data-country="'+esc(p.country||'')+'" tabindex="0" role="button" aria-label="'+esc(p.name)+'" style="cursor:pointer"><circle class="vtgMapPoint" cx="'+x+'" cy="'+y+'" r="'+rad+'" fill="'+color+'"/><title>'+esc(p.name)+(p.country?' · '+esc(p.country):'')+'</title></g>'}).join('')};
out+='<g id="vtgMapCountries">'+drawPoints(D.countries,'countries','#078c91',3.8)+'</g><g id="vtgMapPorts">'+drawPoints(D.ports,'ports','#e46b42',5)+'</g><g id="vtgMapHubs">'+drawPoints(D.hubs,'hubs','#7754cf',5.5)+'</g>';
out+='<g opacity=".65" pointer-events="none">'+svgEl('text',{x:210,y:225,fill:'#456675','font-size':18,'font-weight':800},'NORTH AMERICA')+svgEl('text',{x:400,y:420,fill:'#456675','font-size':18,'font-weight':800},'SOUTH AMERICA')+svgEl('text',{x:585,y:260,fill:'#456675','font-size':18,'font-weight':800},'AFRICA')+svgEl('text',{x:835,y:235,fill:'#456675','font-size':18,'font-weight':800},'ASIA')+svgEl('text',{x:955,y:465,fill:'#456675','font-size':18,'font-weight':800},'AUSTRALIA')+'</g>';
svg.innerHTML=out;
svg.querySelectorAll('[data-kind]').forEach(node=>node.addEventListener('click',()=>{const kind=node.dataset.kind,name=node.dataset.name,country=node.dataset.country;status(name+(country?' · '+country:'')+' — '+({countries:'country / market',ports:'port or terminal',hubs:'trade hub',routes:'shipping corridor'}[kind]||'trade location'));if(kind!=='routes'){const source=D[kind]||[],p=source.find(x=>x.name===name);if(p){cx=lonLat(+p.lon,+p.lat)[0];cy=lonLat(+p.lon,+p.lat)[1];zoom=Math.max(zoom,2);draw();const [px,py]=lonLat(+p.lon,+p.lat);const dot=svg.querySelector('[data-name="'+CSS.escape(name)+'"] circle');if(dot)dot.setAttribute('stroke-width','3')}}}));
document.getElementById('vtgSvgCounts').textContent=(D.countries||[]).length+' markets · '+(D.ports||[]).length+' ports · '+(D.hubs||[]).length+' hubs · '+(D.routes||[]).length+' corridors. No API key required.';
}
function setZoom(n){zoom=Math.min(8,Math.max(1,n));draw()}
function find(){if(!D)return;const q=document.getElementById('vtgSvgSearch').value.trim().toLowerCase();if(!q)return;const all=[...(D.countries||[]).map(x=>({...x,_k:'countries'})),...(D.ports||[]).map(x=>({...x,_k:'ports'})),...(D.hubs||[]).map(x=>({...x,_k:'hubs'}))];const p=all.find(x=>x.name.toLowerCase()===q)||all.find(x=>x.name.toLowerCase().includes(q)||String(x.country||'').toLowerCase().includes(q));if(!p){status('No match found. Try a country, port or hub name.');return}cx=lonLat(+p.lon,+p.lat)[0];cy=lonLat(+p.lat,+p.lat)[1];cy=lonLat(+p.lon,+p.lat)[1];setZoom(Math.max(3,zoom));status('Found '+p.name+(p.country?' · '+p.country:''));}
document.getElementById('vtgSvgFind').onclick=find;document.getElementById('vtgSvgSearch').addEventListener('keydown',e=>{if(e.key==='Enter')find()});
document.getElementById('vtgSvgWorld').onclick=()=>{cx=600;cy=310;setZoom(1);status('Showing world trade overview.')};document.getElementById('vtgSvgHome').onclick=()=>document.getElementById('vtgSvgWorld').click();document.getElementById('vtgSvgPlus').onclick=()=>setZoom(zoom*1.35);document.getElementById('vtgSvgMinus').onclick=()=>setZoom(zoom/1.35);
document.querySelectorAll('[data-vlayer]').forEach(c=>c.addEventListener('change',draw));
svg.addEventListener('pointerdown',e=>{if(e.target.closest('[data-kind]'))return;drag={x:e.clientX,y:e.clientY,cx,cy};svg.setPointerCapture?.(e.pointerId)});svg.addEventListener('pointermove',e=>{if(!drag)return;const rect=svg.getBoundingClientRect(),vbW=1200/zoom,vbH=620/zoom;cx=drag.cx-(e.clientX-drag.x)/rect.width*vbW;cy=drag.cy-(e.clientY-drag.y)/rect.height*vbH;draw()});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);svg.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12))},{passive:false});
try{await loadData();}catch(e){status('The trade data could not load. Refresh the page and try again.');return}
function loadData(){return new Promise((resolve,reject)=>{if(window.VTGTradeAtlasData){D=window.VTGTradeAtlasData;resolve();return}const s=document.createElement('script');s.src=DATA_URL;s.onload=()=>{if(window.VTGTradeAtlasData){D=window.VTGTradeAtlasData;resolve()}else reject(Error('data missing'))};s.onerror=reject;document.head.appendChild(s)})}
draw();status('Interactive map ready. Choose a layer or search for Tin Can Island, Lagos, Shanghai or Busan.');
}
window.VTGStartMapRecovery=open;
if(document.getElementById('mapDrawer')?.classList.contains('open'))open();
})();