/* VTG Trade Atlas: role-specific 3D shipment globe + matching route map, rendered only inside Atlas/map views. */
(() => {
'use strict';
const places=[
 {keys:['tin can island','tin can island port','tin can'],name:'Tin Can Island Port, Lagos',lat:6.45,lng:3.36},
 {keys:['apapa port','apapa'],name:'Apapa Port, Lagos',lat:6.45,lng:3.37},
 {keys:['lekki deep sea port','lekki port','lekki'],name:'Lekki Port, Nigeria',lat:6.43,lng:3.55},
 {keys:['onitsha'],name:'Onitsha, Nigeria',lat:6.15,lng:6.79},{keys:['ibadan'],name:'Ibadan, Nigeria',lat:7.38,lng:3.93},
 {keys:['port harcourt','onne port','onne'],name:'Onne Port, Nigeria',lat:4.69,lng:7.15},{keys:['calabar port','calabar'],name:'Calabar Port, Nigeria',lat:4.95,lng:8.32},
 {keys:['nansha'],name:'Nansha Port, China',lat:22.73,lng:113.61},{keys:['guangzhou'],name:'Guangzhou, China',lat:23.13,lng:113.26},
 {keys:['shanghai'],name:'Shanghai Port, China',lat:31.23,lng:121.47},{keys:['ningbo'],name:'Ningbo-Zhoushan Port, China',lat:29.87,lng:121.55},
 {keys:['yantian'],name:'Yantian Port, Shenzhen',lat:22.57,lng:114.27},{keys:['shenzhen'],name:'Shenzhen, China',lat:22.54,lng:114.06},
 {keys:['qingdao'],name:'Qingdao Port, China',lat:36.07,lng:120.38},{keys:['tianjin','xingang'],name:'Tianjin Port, China',lat:38.99,lng:117.75},
 {keys:['xiamen'],name:'Xiamen Port, China',lat:24.48,lng:118.08},{keys:['yiwu'],name:'Yiwu, China',lat:29.31,lng:120.08},
 {keys:['busan'],name:'Busan Port, South Korea',lat:35.18,lng:129.08},{keys:['incheon'],name:'Incheon Port, South Korea',lat:37.46,lng:126.71},
 {keys:['ulsan'],name:'Ulsan, South Korea',lat:35.52,lng:129.31},{keys:['seoul'],name:'Seoul, South Korea',lat:37.57,lng:126.98}];
const norm=v=>String(v||'').toLowerCase().replace(/[→↔]/g,' ').replace(/\s+/g,' ').trim();
const locate=v=>{const s=norm(v);return places.find(p=>p.keys.some(k=>s.includes(k)))||null};
/* ---- sea lanes: indicative route a ship would follow between two recorded places (not a live position) */
const RAD=Math.PI/180;
function gcPoints(a,b){
 const f1=a[0]*RAD,l1=a[1]*RAD,f2=b[0]*RAD,l2=b[1]*RAD;
 const d=2*Math.asin(Math.sqrt(Math.sin((f2-f1)/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin((l2-l1)/2)**2));
 if(!d||!isFinite(d))return [a,b];
 const n=Math.max(2,Math.ceil(d/0.02)),out=[];
 for(let i=0;i<=n;i++){const t=i/n,A=Math.sin((1-t)*d)/Math.sin(d),B=Math.sin(t*d)/Math.sin(d);
  const x=A*Math.cos(f1)*Math.cos(l1)+B*Math.cos(f2)*Math.cos(l2),y=A*Math.cos(f1)*Math.sin(l1)+B*Math.cos(f2)*Math.sin(l2),z=A*Math.sin(f1)+B*Math.sin(f2);
  out.push([Math.atan2(z,Math.hypot(x,y))/RAD,Math.atan2(y,x)/RAD]);}
 return out;
}
const isAsia=p=>p.lng>100&&p.lat>18,isWAfrica=p=>p.lng<10&&p.lng>-20&&p.lat<9;
function seaWaypoints(a,b){
 let A=a,B=b,rev=false;
 if(isWAfrica(a)&&isAsia(b)){A=b;B=a;rev=true;}
 if(!(isAsia(A)&&isWAfrica(B)))return [[a.lat,a.lng],[b.lat,b.lng]];
 const w=[[A.lat,A.lng]];
 if(A.lat>=37&&A.lng<120)w.push([38.6,119.4],[38.1,121.8],[34.5,123.5]);
 if(A.lng>=118&&A.lng<123&&A.lat>=28&&A.lat<37)w.push([30,123.2]);
 if(A.lat>=25)w.push([24.5,119.5]);
 if(A.lng<115.2)w.push([22.2,113.8],[21.7,114.3]);else w.push([22,116]);
 w.push([11,111],[1.3,104.5],[1.2,103.7],[2.4,101.4],[4,99.5],[6,97.2],[6.4,94.3],[5.2,80.5],[-12,60],[-30,36],[-35.4,21],[-35,17.5],[-31,15],[-22,11.5],[-12,10.5],[-3,7.5],[3.2,4.3],[B.lat,B.lng]);
 return rev?w.reverse():w;
}
function buildLane(r){
 const wp=seaWaypoints(r.from,r.to),pts=[];
 for(let i=0;i<wp.length-1;i++){const seg=gcPoints(wp[i],wp[i+1]);(i?seg.slice(1):seg).forEach(q=>pts.push(q));}
 const cum=[0];for(let i=1;i<pts.length;i++){const dl=pts[i][0]-pts[i-1][0],dg=(pts[i][1]-pts[i-1][1])*Math.cos(pts[i][0]*RAD);cum.push(cum[i-1]+Math.hypot(dl,dg));}
 return {pts,cum,total:cum[cum.length-1]||1};
}
function laneAt(lane,f){
 const target=Math.max(0,Math.min(1,f))*lane.total;let i=1;while(i<lane.cum.length-1&&lane.cum[i]<target)i++;
 const c0=lane.cum[i-1],c1=lane.cum[i],t=c1>c0?(target-c0)/(c1-c0):0,a=lane.pts[i-1],b=lane.pts[i];
 return {lat:a[0]+(b[0]-a[0])*t,lng:a[1]+(b[1]-a[1])*t,east:b[1]>=a[1]};
}
const SHIP_SVG='<svg viewBox="0 0 30 18" width="22" height="13" aria-hidden="true" style="display:block;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.55))"><path d="M1 9h28l-4.5 7H5.5z" fill="#d3423e" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><rect x="6" y="4" width="4" height="5" fill="#fff"/><rect x="11" y="3" width="4" height="6" fill="#ffb81c"/><rect x="16" y="4" width="3.4" height="5" fill="#fff"/><rect x="21" y="1.5" width="4.4" height="7.5" fill="#fff"/><rect x="22.2" y="3" width="2" height="1.6" fill="#d3423e"/></svg>';
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}};
function records(role){
 return [];
}
async function buyerShipmentRecords(role){
 role=role||'buyer';
 const auth=await window.VTG_AUTH_READY;
 const client=auth?.client||window.VTGAuth?.client||window.VTG_SUPABASE;
 if(!client)throw new Error('Secure VTG account service is unavailable. Please reload and try again.');
 const {data:sessionData,error:sessionError}=await client.auth.getSession();
 if(sessionError)throw sessionError;
 const session=sessionData?.session;
 if(!session?.user?.id)throw new Error('Sign in as a '+role+' to view routes linked to your recorded shipments.');
 const {data:profile,error:profileError}=await client.from('profiles').select('role,is_active').eq('id',session.user.id).maybeSingle();
 if(profileError)throw profileError;
 if(profile?.role!==role||profile.is_active!==true)throw new Error('An active '+role+' account is required to view this shipment map.');
 const {data:orders,error:ordersError}=await client.from('trade_orders').select('id,reference,product:products(name)').eq(role+'_id',session.user.id).order('created_at',{ascending:false}).limit(200);
 if(ordersError)throw ordersError;
 if(!orders?.length)return [];
 const orderById=new Map(orders.map(o=>[o.id,o]));
 const {data:shipments,error:shipmentsError}=await client.from('shipments').select('id,order_id,origin_port,destination_port,status,carrier,tracking_number,container_number,created_at').in('order_id',orders.map(o=>o.id)).order('created_at',{ascending:false}).limit(300);
 if(shipmentsError)throw shipmentsError;
 const moving=/departed|in[ _-]?transit|arrived|customs|delivered|at[ _-]?sea|shipped|loaded|dispatched|out for delivery/i;
 return (shipments||[]).filter(s=>moving.test(String(s.status||''))).map(s=>{
  const order=orderById.get(s.order_id)||{};
  return {ref:order.reference||s.id,shipmentId:s.id,goods:order.product?.name||'Recorded shipment',origin:s.origin_port||'',destination:s.destination_port||'',status:s.status,carrier:s.carrier||'',tracking:s.tracking_number||'',createdAt:s.created_at,source:role+' shipment'};
 });
}
async function bankShipmentRecords(){
 const auth=await window.VTG_AUTH_READY;
 const client=auth?.client||window.VTGAuth?.client||window.VTG_SUPABASE;
 if(!client)throw new Error('Secure VTG account service is unavailable. Please reload and try again.');
 const {data:sessionData,error:sessionError}=await client.auth.getSession();
 if(sessionError)throw sessionError;
 const uid=sessionData?.session?.user?.id;
 if(!uid)throw new Error('Sign in as a bank to view shipments on your assigned cases.');
 const {data:profile,error:pe}=await client.from('profiles').select('role,is_active').eq('id',uid).maybeSingle();
 if(pe)throw pe;
 if(profile?.role!=='bank'||profile.is_active!==true)throw new Error('An active bank account is required to view this shipment map.');
 const {data:bank,error:be}=await client.from('bank_profiles').select('verification_status').eq('user_id',uid).maybeSingle();
 if(be)throw be;
 if(bank?.verification_status!=='verified')return [];
 const {data:lcs,error:le}=await client.from('letters_of_credit').select('order_id').eq('bank_id',uid).limit(300);
 if(le)throw le;
 const ids=[...new Set((lcs||[]).map(x=>x.order_id).filter(Boolean))];
 if(!ids.length)return [];
 const {data:orders,error:oe}=await client.from('trade_orders').select('id,reference,product:products(name)').in('id',ids);
 if(oe)throw oe;
 const byId=new Map((orders||[]).map(o=>[o.id,o]));
 const {data:ships,error:se}=await client.from('shipments').select('id,order_id,origin_port,destination_port,status,carrier,tracking_number,created_at').in('order_id',ids).order('created_at',{ascending:false}).limit(300);
 if(se)throw se;
 const moving=/departed|in[ _-]?transit|arrived|customs|delivered|at[ _-]?sea|shipped|loaded|dispatched|out for delivery/i;
 return (ships||[]).filter(s=>moving.test(String(s.status||''))).map(s=>{const o=byId.get(s.order_id)||{};return {ref:o.reference||s.id,shipmentId:s.id,goods:o.product?.name||'Shipment on an assigned case',origin:s.origin_port||'',destination:s.destination_port||'',status:s.status,carrier:s.carrier||'',tracking:s.tracking_number||'',createdAt:s.created_at,source:'assigned case shipment'};});
}
async function init(){
 const role=location.pathname.includes('supplier-dashboard')?'supplier':location.pathname.includes('bank-trade-os')?'bank':'buyer';
 const target=role==='buyer'?document.querySelector('#page-atlas'):role==='supplier'?document.querySelector('#page-logistics'):document.querySelector('#view-shipments');
 if(!target||document.getElementById('vtgShipmentAtlas'))return;if(role==='buyer'){const oldAtlas=target.querySelector(':scope > .panel.panelBody');if(oldAtlas)oldAtlas.hidden=true;}
 const panel=document.createElement('section');panel.id='vtgShipmentAtlas';panel.className='vtgShipmentPanel';
 panel.innerHTML='<style>.vtgShipmentPanel{margin:16px 0 22px;border:1px solid var(--line,#2a3945);border-radius:18px;overflow:hidden;background:var(--panel,#121c25);color:var(--ink,var(--text,#edf3f7))}.vtgShipmentPanel .saHead{padding:18px 20px;border-bottom:1px solid var(--line,#2a3945)}.vtgShipmentPanel h2{font-size:18px;margin:0 0 6px}.vtgShipmentPanel p{font-size:12px;line-height:1.6;color:var(--muted,#aab8c3);margin:0}.vtgShipmentPanel .saBadge{display:inline-block;margin-top:9px;font-size:10px;border:1px solid var(--line,#2a3945);padding:5px 9px;border-radius:99px}.vtgShipmentPanel .saMapHead{padding:14px 18px;border-top:1px solid var(--line,#2a3945);font-size:13px;font-weight:800}.vtgShipmentPanel #vtgShipmentGlobe{height:340px;min-height:280px;background:radial-gradient(ellipse at center,#15364b 0%,#071321 70%)}.vtgShipmentPanel #vtgShipmentMap{height:360px;min-height:300px;background:#eaf0f4}.vtgShipmentPanel .saList{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:14px}.vtgShipmentPanel .saItem{padding:12px;border:1px solid var(--line,#2a3945);border-radius:12px;cursor:pointer}.vtgShipmentPanel .saItem[aria-pressed=true]{border-color:#55c6a1;box-shadow:0 0 0 1px #55c6a1}.vtgShipmentPanel .saItem b,.vtgShipmentPanel .saItem small{display:block}.vtgShipmentPanel .saItem b{font-size:12px;margin-bottom:5px}.vtgShipmentPanel .saItem small{font-size:11px;line-height:1.6;color:var(--muted,#aab8c3)}.vtgShipmentPanel .saEmpty{padding:16px;color:var(--muted,#aab8c3);font-size:12px;line-height:1.7}.vtgShipmentPanel .saNote{padding:10px 16px;font-size:11px;color:var(--muted,#aab8c3);border-top:1px solid var(--line,#2a3945)}@media(max-width:700px){.vtgShipmentPanel #vtgShipmentGlobe{height:290px;min-height:250px}.vtgShipmentPanel #vtgShipmentMap{height:320px}}</style><div class="saHead"><h2>Trade Atlas & shipment map</h2><p>Select a shipment below to highlight its route on the map. Only routes tied to this workspace&#39;s recorded orders or shipments are shown.</p><span class="saBadge">'+(role==='bank'?'Bank view · authorised customer case records':role==='supplier'?'Supplier view · your recorded shipments':'Buyer view · your recorded orders')+'</span></div><div class="saList" id="vtgSARoutes"><div class="saEmpty">Loading recorded route details…</div></div><div class="saMapHead">3D Trade Atlas · only recorded shipment routes</div><div id="vtgShipmentGlobe" role="img" aria-label="Interactive 3D Earth showing only this workspace&#39;s recorded shipment routes"></div><div class="saMapHead">Matching geographic map</div><div id="vtgShipmentMap" role="region" aria-label="Interactive map of this workspace&#39;s recorded shipment routes"></div><div class="saNote">The moving ship illustrates the selected route, not live vessel GPS. Actual vessel positions require verified carrier/AIS updates. Generic country-only routes are not drawn.</div>';
 if(role==='bank')target.insertBefore(panel,target.firstElementChild);else target.insertBefore(panel,target.firstElementChild?.nextElementSibling||null);
 const list=panel.querySelector('#vtgSARoutes');
 panel.insertAdjacentHTML('beforeend','<p style="margin:0;padding:10px 20px 14px;font-size:11.5px;line-height:1.5;color:var(--muted,#8aa0b2)">Only locations on your own shipments are shown. The red-to-green line is the indicative sea lane between the recorded origin and destination and the small ship shows the direction of travel. It is not a live vessel position; live AIS positions (gold dot) appear only when a tracking feed is connected. Click an origin or destination dot for port or airport photos.</p>');
 let sourceRecords=[];
 if(role==='buyer'||role==='supplier'||role==='bank'){
  try{sourceRecords=role==='bank'?await bankShipmentRecords():await buyerShipmentRecords(role);}
  catch(error){list.innerHTML='<div class="saEmpty"><strong>Shipment routes could not be loaded.</strong><br>'+esc(error.message||'Please sign in and try again.')+'</div>';sourceRecords=[];}
 }else sourceRecords=records(role);
 const routes=sourceRecords.map(r=>{const from=locate(r.origin),to=locate(r.destination);return from&&to&&from.name!==to.name?{...r,from,to}:null}).filter(Boolean);
 list.innerHTML=routes.length?routes.map((r,i)=>'<button type="button" class="saItem" data-route="'+i+'" aria-pressed="'+(i===0?'true':'false')+'"><b>'+esc(r.goods)+' · '+esc(r.ref)+'</b><small>'+esc(r.from.name)+' → '+esc(r.to.name)+'</small><small>Status: '+esc(r.status)+' · Select to focus both views</small>'+(r.carrier?'<small>Carrier: '+esc(r.carrier)+'</small>':'')+'</button>').join(''):'<div class="saEmpty"><strong>No specific route is available yet.</strong><br>Record a shipment with a recognised origin port/city, destination port/city and a movement status. Country-only entries and unrelated sample corridors are intentionally excluded.</div>';
 let map=null,mapRoutes=[],shipMarker=null,selected=-1,globe=null,liveVesselMarker=null,liveVesselPosition=null,globePoints=[];
 const shipIcon=()=>window.L.divIcon({className:'vtgShipMarker',html:'<div class="vtgShipFlip" style="width:22px;height:13px">'+SHIP_SVG+'</div>',iconSize:[22,13],iconAnchor:[11,7]});
 const lanes=routes.map(buildLane);const openPlace=pl=>{if(window.VTGPortGallery){try{window.VTGPortGallery.zoomOpen({name:pl.name,lat:pl.lat,lng:pl.lng},{globe,map});}catch(_){}}};let globeShips=[],leafShips=[],lastTick=0;
 function applyLiveVesselPosition(p){
  const lat=Number(p?.latitude),lng=Number(p?.longitude);
  if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180)return;
  liveVesselPosition=p;
  if(map&&window.L){
   if(liveVesselMarker)map.removeLayer(liveVesselMarker);
   liveVesselMarker=window.L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:2,fillColor:'#b49a70',fillOpacity:1}).addTo(map);
   const stamp=p.position_time?new Date(p.position_time).toLocaleString():'timestamp unavailable';
   liveVesselMarker.bindPopup('<strong>Provider-reported AIS position</strong><br>'+esc(p.provider||'AIS')+'<br>'+esc(stamp)+'<br><small>This position does not prove a specific container is aboard.</small>');
   if(selected<0)map.setView([lat,lng],Math.max(map.getZoom(),4));
  }
  if(globe&&typeof globe.pointsData==='function'){
   const vesselPoint={name:'AIS position · '+(p.provider||'provider'),lat,lng,color:'#b49a70',routeIndex:null};
   globe.pointsData([...globePoints,vesselPoint]);
   globe.pointOfView({lat,lng,altitude:1.55},650);
  }
 }
 window.addEventListener('vtg:buyer-vessel-position',event=>applyLiveVesselPosition(event.detail||{}));
 function focus(i){if(i<0||i>=routes.length)return;selected=i;list.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.route===i)));
  if(globe){const pts=lanes[i].pts,mid=pts[Math.floor(pts.length/2)];globe.pointOfView({lat:mid[0],lng:mid[1],altitude:routes[i].from.name&&lanes[i].total>60?2.1:1.5},650);if(typeof globe.pathStroke==='function')globe.pathStroke(d=>d.routeIndex===i?.75:.35);}
  if(map&&mapRoutes[i]){map.fitBounds(mapRoutes[i].getBounds().pad(.3),{maxZoom:6});mapRoutes.forEach((l,j)=>l.setStyle({weight:j===i?3.5:2,opacity:j===i?1:.4,color:j===i?'#d3423e':'#607d8b'}));}
 }
 /* one loop moves a small ship along every route's lane, from origin to destination, on both the map and the globe */
 function tickShips(now){
  requestAnimationFrame(tickShips);
  if(now-lastTick<45||document.hidden||!panel.offsetParent)return;lastTick=now;
  const PERIOD=19000,TRAVEL=17000;
  const prog=i=>Math.min(1,(((now+i*2300)%PERIOD))/TRAVEL);
  if(map&&window.L&&!leafShips.length&&routes.length)leafShips=routes.map((r,i)=>{const m=window.L.marker([r.from.lat,r.from.lng],{icon:shipIcon(),interactive:false,keyboard:false,zIndexOffset:900}).addTo(map);return m;});
  leafShips.forEach((m,i)=>{const p=laneAt(lanes[i],prog(i));m.setLatLng([p.lat,p.lng]);const el=m.getElement&&m.getElement();const f=el&&el.firstChild;if(f)f.style.transform=p.east?'none':'scaleX(-1)';});
  if(globe&&typeof globe.htmlElementsData==='function'&&routes.length){
   if(!globeShips.length)globeShips=routes.map((r,i)=>{const el=document.createElement('div');el.style.cssText='pointer-events:none;width:22px;height:13px;transform:translate(-50%,-50%)';el.innerHTML=SHIP_SVG;return {lat:r.from.lat,lng:r.from.lng,el,i};});
   globeShips.forEach(g=>{const p=laneAt(lanes[g.i],prog(g.i));g.lat=p.lat;g.lng=p.lng;g.el.firstChild.style.transform=p.east?'none':'scaleX(-1)';});
   globe.htmlElementsData(globeShips);
  }
 }
 requestAnimationFrame(tickShips);
 list.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>focus(+b.dataset.route)));
 const initShipmentGlobe=()=>{
  const node=panel.querySelector('#vtgShipmentGlobe');
  const loadGlobe=()=>new Promise((resolve,reject)=>{
   if(window.Globe)return resolve();
   if(window.__vtgShipmentGlobePromise)return window.__vtgShipmentGlobePromise.then(resolve,reject);
   window.__vtgShipmentGlobePromise=new Promise((ok,no)=>{
    const script=document.createElement('script');script.src='https://unpkg.com/globe.gl';script.onload=()=>window.Globe?ok():no(Error('Globe library unavailable'));script.onerror=()=>no(Error('Globe library unavailable'));document.head.appendChild(script);
   });
   window.__vtgShipmentGlobePromise.then(resolve,reject);
  });
  loadGlobe().then(()=>{
   const endpoints=new Map();
   routes.forEach((r,i)=>{[[r.from,0],[r.to,1]].forEach(([p,side])=>{if(!endpoints.has(p.name))endpoints.set(p.name,{name:p.name,lat:p.lat,lng:p.lng,color:side?'#64d9b0':'#f06a60',routeIndex:i})})});
   const points=[...endpoints.values()];globePoints=points;
   const paths=routes.map((r,i)=>({pts:lanes[i].pts,routeIndex:i,label:r.goods+' · '+r.status}));
   globe=window.Globe()(node)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .showAtmosphere(true).atmosphereColor('#55bfe8').atmosphereAltitude(.16)
    .pointsData(points).pointLat('lat').pointLng('lng').pointColor('color').pointAltitude(.012).pointRadius(.05).pointLabel('name')
    .pathsData(paths).pathPoints('pts').pathPointLat(q=>q[0]).pathPointLng(q=>q[1]).pathPointAlt(.004).pathColor(()=>['#64d9b0','#f06a60']).pathStroke(.5).pathDashLength(.3).pathDashGap(.12).pathDashAnimateTime(9000).pathLabel('label')
    .htmlLat('lat').htmlLng('lng').htmlAltitude(.012).htmlElement(d=>d.el).htmlTransitionDuration(0)
    .onPointClick(p=>{if(Number.isInteger(p.routeIndex))selected=p.routeIndex;if(p.place&&window.VTGPortGallery){window.VTGPortGallery.zoomOpen(p.place,{globe,map});}else if(window.VTGPortGallery){try{window.VTGPortGallery.zoomOpen({name:p.name,lat:p.lat,lng:p.lng},{globe,map});}catch(_){}}})
   globe.width(node.clientWidth||600).height(node.clientHeight||340).pointOfView({lat:15,lng:55,altitude:2.2},0);
   const dayTexture='https://unpkg.com/three-globe/example/img/earth-day.jpg';
   const nightTexture='https://unpkg.com/three-globe/example/img/earth-night.jpg';
   const nightSky='https://unpkg.com/three-globe/example/img/night-sky.png';
   const applyGlobeTheme=()=>{const light=document.documentElement.getAttribute('data-theme')==='light';globe.globeImageUrl(light?dayTexture:nightTexture);globe.backgroundImageUrl(light?'':nightSky);globe.backgroundColor(light?'#edf4f8':'#071321');node.style.background=light?'radial-gradient(ellipse at center,#eaf3f8 0%,#cddde7 72%)':'radial-gradient(ellipse at center,#15364b 0%,#071321 70%)';};
   applyGlobeTheme();
   document.addEventListener('vtg:themechange',applyGlobeTheme);
   new MutationObserver(applyGlobeTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
   const controls=globe.controls();if(controls){controls.autoRotate=true;controls.autoRotateSpeed=.25;controls.enableDamping=true}
   if(liveVesselPosition)applyLiveVesselPosition(liveVesselPosition);
   window.addEventListener('resize',()=>{if(globe)globe.width(node.clientWidth||600).height(node.clientHeight||340)},{passive:true});
  }).catch(()=>{node.innerHTML='<div style="height:100%;display:grid;place-items:center;padding:22px;color:#b5c4d2;text-align:center;font-size:12px">The 3D globe library could not load on this connection. The matching geographic map below remains available.</div>'});
 };
 const loadCss=url=>new Promise((resolve,reject)=>{if(document.querySelector('link[data-vtg-shipment-leaflet]'))return resolve();const l=document.createElement('link');l.rel='stylesheet';l.href=url;l.dataset.vtgShipmentLeaflet='1';l.onload=resolve;l.onerror=reject;document.head.appendChild(l)});
 const loadLeaflet=()=>new Promise((resolve,reject)=>{if(window.L)return resolve();const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>window.L?resolve():reject(Error('Leaflet unavailable'));s.onerror=()=>reject(Error('Leaflet unavailable'));document.head.appendChild(s)});
 initShipmentGlobe();
 Promise.all([loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),loadLeaflet()]).then(()=>{
  const node=panel.querySelector('#vtgShipmentMap');map=window.L.map(node,{worldCopyJump:true,zoomControl:true,scrollWheelZoom:true,minZoom:2,maxZoom:18}).setView([17,38],2);
  let tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map),failed=0,loaded=false;
  tiles.on('tileload',()=>{loaded=true});tiles.on('tileerror',()=>{if(!loaded&&++failed===4){map.removeLayer(tiles);const alt=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);alt.on('tileerror',()=>{node.insertAdjacentHTML('beforeend','<div style="padding:12px;font-size:12px">Map tiles unavailable on this connection. <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener">Open OpenStreetMap</a>.</div>')})}});
  routes.forEach((r,i)=>{const line=L.polyline(lanes[i].pts,{color:i===0?'#d3423e':'#607d8b',weight:i===0?3.5:2,opacity:i===0?1:.4,dashArray:'6 6'}).addTo(map);line.bindTooltip(esc(r.goods)+' · '+esc(r.status));line.on('click',()=>focus(i));mapRoutes.push(line);L.circleMarker([r.from.lat,r.from.lng],{radius:2.6,color:'#fff',weight:1,fillColor:'#e46b42',fillOpacity:1}).bindTooltip('Origin: '+esc(r.from.name)).on('click',()=>openPlace(r.from)).addTo(map);L.circleMarker([r.to.lat,r.to.lng],{radius:2.6,color:'#fff',weight:1,fillColor:'#078c91',fillOpacity:1}).bindTooltip('Destination: '+esc(r.to.name)).on('click',()=>openPlace(r.to)).addTo(map)});
  if(routes.length)focus(0);else map.setView([17,38],2);if(liveVesselPosition)applyLiveVesselPosition(liveVesselPosition);setTimeout(()=>map.invalidateSize(),180);window.addEventListener('resize',()=>map&&map.invalidateSize(),{passive:true});document.querySelectorAll('[data-view="atlas"],[data-page="logistics"],[data-view="shipments"]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{if(map)map.invalidateSize();if(globe){const n=panel.querySelector('#vtgShipmentGlobe');globe.width(n.clientWidth||600).height(n.clientHeight||340)}},220)));
 }).catch(()=>{panel.querySelector('#vtgShipmentMap').innerHTML='<div style="padding:22px;color:#243746;font-size:12px">Interactive map library could not load on this connection. Shipment routes remain listed above.</div>'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,150),{once:true});else setTimeout(init,150);
})();