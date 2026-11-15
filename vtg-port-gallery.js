/* VTG port & airport gallery — click a place on a map or globe to see rotating photos (every 4 s) and details.
   Photos: looked up live on Wikimedia Commons (openly licensed, credited). Details: VTG_PORTS (OurAirports + NGA World Port Index)
   plus a Wikipedia summary when one exists. Nothing is invented: if no photo or summary is found, the panel says so. */
(function(){
'use strict';
if(window.VTGPortGallery)return;
const ROTATE_MS=4000,TTL=7*864e5,MAX_PHOTOS=8;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https?:\/\//i.test(String(u||''))?String(u):'#';
const places=()=>Array.isArray(window.VTG_PORTS)?window.VTG_PORTS:[];
const STOP=/\b(port|airport|international|intl|seaport|terminal|terminals|harbour|harbor|of|the|and|new|old|container|deep|sea|apapa|island)\b/g;
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const tokens=s=>norm(s).replace(STOP,' ').split(' ').filter(t=>t.length>2);
function km(aLat,aLon,bLat,bLon){const r=Math.PI/180,x=(bLon-aLon)*r*Math.cos((aLat+bLat)/2*r),y=(bLat-aLat)*r;return Math.sqrt(x*x+y*y)*6371;}
const kindOf=t=>/air/i.test(t||'')?'A':'S';

/* Find the dataset record for a clicked marker; otherwise build a place from what the page knows. */
function resolve(q){
 q=q||{};const lat=+q.lat,lon=+(q.lon??q.lng),name=q.name||q.n||'';
 if(q.id){const hit=places().find(p=>p.id===q.id);if(hit)return hit;}
 const nt=tokens(name);let best=null,bestScore=1e9;
 if(Number.isFinite(lat)&&Number.isFinite(lon)){
  for(const p of places()){
   const d=km(lat,lon,p.lat,p.lon);if(d>40)continue;
   const pt=tokens(p.n+' '+(p.k||'')),shared=nt.filter(t=>pt.includes(t)).length;
   const kindOk=!q.type||kindOf(q.type)===p.t||!/air|sea|port/i.test(q.type);
   if(!kindOk)continue;
   const score=d-shared*15;if((shared>0||d<2)&&score<bestScore){best=p;bestScore=score;}
  }
 }
 if(best)return best;
 return {id:'x-'+norm(name).replace(/ /g,'-')+'-'+(Number.isFinite(lat)?lat.toFixed(2):''),t:kindOf(q.type||name),n:name||'Selected location',c:q.country||q.c||'',k:q.city||q.k||'',lat,lon,code:q.code||'',custom:true};
}

/* ---- network helpers */
async function getJSON(url,ms){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||9000);
 try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error('http '+r.status);return await r.json();}finally{clearTimeout(t);}
}
const API='https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=1100&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName|Categories';
const BAD=/\b(logo|flag|map|coat of arms|diagram|icon|seal|locator|symbol|emblem|route|chart|plan|schematic|signature|stamp|banner|poster|timetable|ticket|boarding|screenshot)\b/i;
/* Only pictures that actually show shipping (ports, ships, terminals, cranes…) or an airport (aircraft, runway, terminal…). */
const SEA_OK=/\b(ports?|seaports?|harbou?rs?|terminals?|containers?|ships?|shipping|vessels?|cargo|quays?|quayside|wharf|wharves|docks?|dockyard|jetty|berths?|cranes?|gantry|freighters?|tankers?|ferr(?:y|ies)|piers?|maritime|shipyard|port authority|bulk carrier|roro|ro-ro)\b/i;
const AIR_OK=/\b(airports?|airfield|aerodrome|aircraft|aeroplanes?|airplanes?|airliners?|planes?|runways?|apron|tarmac|terminals?|control tower|hangar|airbus|boeing|embraer|flights?|aviation|jets?|airlines?)\b/i;
const OFF_TOPIC=/\b(portraits?|selfie|wedding|church|mosque|hotel|restaurant|food|party|football|stadium|concert|protest|election|market stall|school|students?|bride|funeral)\b/i;
const relevant=(text,kind)=>!OFF_TOPIC.test(text)&&(kind==='A'?AIR_OK:SEA_OK).test(text);
function toPhotos(json,nameTokens,trusted,kind){
 const pages=Object.values(json?.query?.pages||{}),out=[];
 for(const pg of pages){
  const ii=pg.imageinfo?.[0];if(!ii||!/^image\/(jpeg|png|webp)$/.test(ii.mime||''))continue;
  const title=String(pg.title||'').replace(/^File:/,'').replace(/\.[a-z]+$/i,'');
  if(BAD.test(title)||(ii.width||0)<600||(ii.height||0)<350)continue;
  const mdx=ii.extmetadata||{};
  if(!relevant(title+' '+String(mdx.ImageDescription?.value||'').replace(/<[^>]*>/g,' ')+' '+String(mdx.Categories?.value||'').replace(/\|/g,' '),kind))continue;
  const tl=norm(title),hits=nameTokens.filter(t=>tl.includes(t)).length;
  if(!trusted&&nameTokens.length&&!hits)continue;
  const md=ii.extmetadata||{},strip=h=>String(h||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  out.push({src:ii.thumburl||ii.url,page:ii.descriptionurl,title:strip(md.ObjectName?.value)||title,credit:strip(md.Artist?.value).slice(0,80)||'Wikimedia Commons contributor',license:strip(md.LicenseShortName?.value)||'See file page',licenseUrl:md.LicenseUrl?.value||'',score:hits*10+(trusted?0:5)+Math.min((ii.width||0)/1000,3)});
 }
 return out;
}
async function findPhotos(p){
 const nt=tokens(p.n),word=p.t==='A'?'airport':'port';
 const queries=[`"${p.n}" ${word}`,`${p.n} ${p.k||p.c} ${word}`];
 const calls=queries.map(q=>getJSON(API+'&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch='+encodeURIComponent(q+' filetype:bitmap')).then(j=>toPhotos(j,nt,false,p.t)).catch(()=>[]));
 if(Number.isFinite(p.lat)&&Number.isFinite(p.lon))calls.push(getJSON('https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query&list=geosearch&gsnamespace=6&gsradius=5000&gslimit=40&gscoord='+p.lat+'%7C'+p.lon).then(async j=>{
  const ids=(j?.query?.geosearch||[]).map(g=>g.pageid).slice(0,30);if(!ids.length)return [];
  return toPhotos(await getJSON(API+'&pageids='+ids.join('%7C')),nt,true,p.t);
 }).catch(()=>[]));
 const all=(await Promise.all(calls)).flat(),seen=new Set(),uniq=[];
 all.sort((a,b)=>b.score-a.score).forEach(x=>{if(!seen.has(x.src)){seen.add(x.src);uniq.push(x);}});
 return uniq.slice(0,MAX_PHOTOS);
}
async function findSummary(p){
 const base='https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=extracts|info&exintro=1&explaintext=1&exchars=650&inprop=url&redirects=1&titles=';
 let title=p.w||'';
 try{
  if(!title){
   const j=await getJSON('https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&list=search&srlimit=1&srsearch='+encodeURIComponent(p.n+' '+(p.t==='A'?'airport':'port')+' '+(p.c||'')));
   const hit=j?.query?.search?.[0];if(hit&&tokens(p.n).some(t=>norm(hit.title).includes(t)))title=hit.title;
  }
  if(!title)return null;
  const j=await getJSON(base+encodeURIComponent(title));const pg=Object.values(j?.query?.pages||{})[0];
  if(!pg||pg.missing!==undefined||!pg.extract)return null;
  return {text:pg.extract.trim(),url:pg.fullurl,title:pg.title};
 }catch(_){return null;}
}
function cacheGet(id){try{const v=JSON.parse(localStorage.getItem('vtgpg:v1:'+id)||'null');return v&&Date.now()-v.at<TTL?v:null;}catch(_){return null;}}
function cachePut(id,photos,summary){try{localStorage.setItem('vtgpg:v1:'+id,JSON.stringify({at:Date.now(),photos,summary}));}catch(_){}}

/* ---- UI */
let root=null,timer=null,state=null,lastFocus=null;
function css(){
 if(document.getElementById('vtgpg-css'))return;
 const s=document.createElement('style');s.id='vtgpg-css';
 s.textContent='.vtgpg{position:fixed;inset:0;z-index:100000;background:rgba(10,20,40,.62);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Manrope,system-ui,Arial,sans-serif}'
 +'.vtgpg-card{background:#fff;color:#14233c;width:min(940px,100%);max-height:calc(100vh - 28px);border-radius:16px;overflow:hidden;display:grid;grid-template-columns:1.25fr 1fr;box-shadow:0 24px 70px rgba(0,0,0,.4)}'
 +'.vtgpg-media{position:relative;background:#0b1830;min-height:300px;display:flex;flex-direction:column}'
 +'.vtgpg-stage{position:relative;flex:1;min-height:260px;overflow:hidden}'
 +'.vtgpg-stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .7s ease}'
 +'.vtgpg-stage img.on{opacity:1}'
 +'.vtgpg-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;color:#cfd9ee;font-size:14px;line-height:1.5}'
 +'.vtgpg-cap{padding:8px 12px 10px;font-size:11.5px;color:#cfd9ee;background:#0b1830;line-height:1.4;min-height:44px}'
 +'.vtgpg-cap a{color:#FFB81C}'
 +'.vtgpg-ctl{position:absolute;left:0;right:0;bottom:56px;display:flex;justify-content:center;align-items:center;gap:6px;pointer-events:none}'
 +'.vtgpg-ctl>*{pointer-events:auto}'
 +'.vtgpg-dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.45);cursor:pointer}'
 +'.vtgpg-dot.on{background:#FFB81C;width:22px;border-radius:6px;transition:width .3s}'
 +'.vtgpg-nav{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;border:0;background:rgba(10,20,40,.55);color:#fff;font-size:20px;cursor:pointer}'
 +'.vtgpg-nav.p{left:10px}.vtgpg-nav.n{right:10px}'
 +'.vtgpg-pause{border:0;border-radius:12px;background:rgba(10,20,40,.6);color:#fff;font-size:11px;padding:3px 9px;cursor:pointer;margin-left:6px}'
 +'.vtgpg-bar{position:absolute;left:0;bottom:0;height:3px;background:#FFB81C;width:0}'
 +'.vtgpg-side{padding:18px 20px;overflow:auto;position:relative}'
 +'.vtgpg-x{position:absolute;top:8px;right:10px;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#14233c}'
 +'.vtgpg-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:12px;background:#e7efff;color:#1558D6}'
 +'.vtgpg-tag.a{background:#fff3d1;color:#8a5a00}'
 +'.vtgpg-side h2{margin:8px 28px 2px 0;font-size:20px;line-height:1.2}'
 +'.vtgpg-loc{margin:0 0 12px;color:#4a5b78;font-size:13.5px}'
 +'.vtgpg-dl{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;margin:0 0 12px;font-size:13px}'
 +'.vtgpg-dl dt{color:#5a6b88}.vtgpg-dl dd{margin:0;font-weight:600;word-break:break-word}'
 +'.vtgpg-sum{font-size:13.5px;line-height:1.55;margin:0 0 6px}'
 +'.vtgpg-note{font-size:11.5px;color:#5a6b88;line-height:1.45;margin-top:10px}'
 +'.vtgpg-side a{color:#1558D6}'
 +'@media(max-width:700px){.vtgpg-card{grid-template-columns:1fr;overflow:auto}.vtgpg-stage{min-height:230px}}'
 +'@media(prefers-reduced-motion:reduce){.vtgpg-stage img{transition:none}}';
 document.head.append(s);
}
function stop(){clearInterval(timer);timer=null;}
function show(i){
 const s=state;if(!s||!s.photos.length)return;
 s.i=(i+s.photos.length)%s.photos.length;
 s.imgs.forEach((im,k)=>im.classList.toggle('on',k===s.i));
 s.dots.forEach((d,k)=>{d.classList.toggle('on',k===s.i);d.setAttribute('aria-current',k===s.i?'true':'false');});
 const ph=s.photos[s.i];
 s.cap.innerHTML='<strong>'+esc(ph.title)+'</strong><br>Photo: '+esc(ph.credit)+' · <a href="'+esc(safeUrl(ph.licenseUrl||ph.page))+'" target="_blank" rel="noopener">'+esc(ph.license)+'</a> · <a href="'+esc(safeUrl(ph.page))+'" target="_blank" rel="noopener">Wikimedia Commons</a> · '+(s.i+1)+'/'+s.photos.length;
 const nxt=s.imgs[(s.i+1)%s.imgs.length];if(nxt&&!nxt.src)nxt.src=nxt.dataset.src;
 s.bar.style.transition='none';s.bar.style.width='0';void s.bar.offsetWidth;
 if(!s.paused){s.bar.style.transition='width '+ROTATE_MS+'ms linear';s.bar.style.width='100%';}
}
function play(){
 stop();const s=state;if(!s||s.photos.length<2||s.paused)return;
 timer=setInterval(()=>{if(document.hidden||s.hover)return;show(s.i+1);},ROTATE_MS);
 show(s.i);
}
function close(){stop();if(root){root.remove();root=null;}state=null;document.removeEventListener('keydown',onKey);if(lastFocus&&lastFocus.focus)try{lastFocus.focus();}catch(_){}}
function onKey(e){if(e.key==='Escape')close();else if(state&&e.key==='ArrowRight')show(state.i+1);else if(state&&e.key==='ArrowLeft')show(state.i-1);}
function details(p){
 const rows=[];const add=(k,v)=>{if(v!==undefined&&v!==null&&v!=='')rows.push('<dt>'+esc(k)+'</dt><dd>'+v+'</dd>');};
 add('Country',esc(p.c));add('Area',esc(p.k));
 if(p.t==='A'){add('IATA / ICAO',esc([p.code,p.ic].filter(Boolean).join(' / ')));add('Size class',esc(p.z));add('Longest runway',p.rw?Math.round(p.rw*0.3048).toLocaleString()+' m ('+p.rw.toLocaleString()+' ft)':'');add('Elevation',p.el!==undefined?Math.round(p.el*0.3048).toLocaleString()+' m':'');if(p.u)add('Website','<a href="'+esc(safeUrl(p.u))+'" target="_blank" rel="noopener">Official site</a>');}
 else{add('World Port Index no.',esc(String(p.code||'').replace('WPI','')));add('Max vessel size',esc(p.mv));add('Mean tidal range',p.td!==undefined&&p.td!==null?esc(p.td)+' m':'');if(p.er&&p.er.length)add('Entrance limits',esc(p.er.join(', ')));}
 if(p.curated)add('Role',esc(p.curated));
 if(Number.isFinite(p.lat))add('Coordinates',p.lat.toFixed(4)+', '+p.lon.toFixed(4));
 return '<dl class="vtgpg-dl">'+rows.join('')+'</dl>';
}
async function open(q){
 const p=resolve(q);if(q&&q.role)p.curated=q.role;
 css();close();lastFocus=document.activeElement;
 root=document.createElement('div');root.className='vtgpg';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',p.n+' photos and details');
 root.innerHTML='<div class="vtgpg-card"><div class="vtgpg-media"><div class="vtgpg-stage"><div class="vtgpg-empty">Looking for photos of '+esc(p.n)+'…</div></div><div class="vtgpg-cap"></div></div><div class="vtgpg-side"><button class="vtgpg-x" type="button" aria-label="Close">×</button><span class="vtgpg-tag'+(p.t==='A'?' a':'')+'">'+(p.t==='A'?'Airport':'Seaport')+'</span><h2>'+esc(p.n)+'</h2><p class="vtgpg-loc">'+esc([p.k,p.c].filter(Boolean).join(', '))+'</p>'+details(p)+'<div class="vtgpg-sum" data-sum>Loading description…</div><p class="vtgpg-note">Photos come from Wikimedia Commons and are credited to their authors. Facility details come from public datasets (OurAirports; NGA World Port Index) and may be out of date, so confirm with the port or airport authority before relying on them.</p></div></div>';
 document.body.append(root);document.addEventListener('keydown',onKey);
 root.addEventListener('click',e=>{if(e.target===root||e.target.closest('.vtgpg-x'))close();});
 root.querySelector('.vtgpg-x').focus();
 const mine=root;
 let data=cacheGet(p.id);
 if(!data){
  const [photos,summary]=await Promise.all([findPhotos(p).catch(()=>[]),findSummary(p)]);
  data={photos,summary};if(photos.length||summary)cachePut(p.id,photos,summary);
 }
 if(root!==mine)return; // closed or replaced while loading
 const sum=root.querySelector('[data-sum]');
 sum.innerHTML=data.summary?esc(data.summary.text)+' <a href="'+esc(safeUrl(data.summary.url))+'" target="_blank" rel="noopener">Wikipedia</a>':'No public description was found for this place.';
 const stage=root.querySelector('.vtgpg-stage'),cap=root.querySelector('.vtgpg-cap');
 if(!data.photos.length){stage.innerHTML='<div class="vtgpg-empty">No openly licensed photo of '+esc(p.n)+' was found on Wikimedia Commons. You can still search for this place on the web or the operator’s website.</div>';return;}
 stage.innerHTML='';
 const imgs=data.photos.map((ph,k)=>{const im=document.createElement('img');im.alt=ph.title;im.dataset.src=ph.src;im.decoding='async';im.referrerPolicy='no-referrer';if(k<2)im.src=ph.src;im.addEventListener('error',()=>{im.style.display='none';});stage.append(im);return im;});
 const ctl=document.createElement('div');ctl.className='vtgpg-ctl';
 const dots=data.photos.map((_,k)=>{const d=document.createElement('button');d.type='button';d.className='vtgpg-dot';d.setAttribute('aria-label','Photo '+(k+1));d.addEventListener('click',()=>{show(k);play();});ctl.append(d);return d;});
 const bar=document.createElement('div');bar.className='vtgpg-bar';stage.append(bar);
 state={p,photos:data.photos,imgs,dots,cap,bar,i:0,paused:false,hover:false};
 if(data.photos.length>1){
  const pv=document.createElement('button'),nx=document.createElement('button'),pa=document.createElement('button');
  pv.className='vtgpg-nav p';nx.className='vtgpg-nav n';pv.type=nx.type=pa.type='button';pv.textContent='‹';nx.textContent='›';pv.setAttribute('aria-label','Previous photo');nx.setAttribute('aria-label','Next photo');
  pa.className='vtgpg-pause';pa.textContent='Pause';
  pv.addEventListener('click',()=>{show(state.i-1);play();});nx.addEventListener('click',()=>{show(state.i+1);play();});
  pa.addEventListener('click',()=>{state.paused=!state.paused;pa.textContent=state.paused?'Play':'Pause';if(state.paused){stop();bar.style.transition='none';bar.style.width='0';}else play();});
  ctl.append(pa);stage.append(pv,nx);
  stage.addEventListener('mouseenter',()=>{state.hover=true;});stage.addEventListener('mouseleave',()=>{state.hover=false;});
 }
 stage.append(ctl);
 show(0);play();
}

/* ---- helpers for map pages */
function addToLeaflet(L,map,opts){
 opts=opts||{};const group=L.layerGroup(),renderer=L.canvas({padding:.5});
 places().forEach(p=>{
  if(opts.types&&!opts.types.includes(p.t))return;
  const m=L.circleMarker([p.lat,p.lon],{renderer,radius:p.t==='A'?2.2:2.4,color:'#fff',weight:.6,fillColor:p.t==='A'?'#FFB81C':'#1558D6',fillOpacity:.92});
  m.bindTooltip(esc(p.n)+' · '+(p.t==='A'?'airport':'seaport')+(p.c?' · '+esc(p.c):''),{direction:'top'});
  m.on('click',()=>open(p));m.addTo(group);
 });
 group.addTo(map);return group;
}
function globePoints(){return places().map(p=>({lat:p.lat,lng:p.lon,name:p.n,color:p.t==='A'?'#FFB81C':'#1558D6',r:.045,place:p}));}
function search(q){q=norm(q);if(!q)return null;return places().find(p=>norm(p.n)===q||(p.code&&p.code.toLowerCase()===q))||places().find(p=>norm(p.n+' '+p.k+' '+p.c).includes(q))||null;}
window.VTGPortGallery={open,close,resolve,search,places,addToLeaflet,globePoints,_findPhotos:findPhotos};
})();
