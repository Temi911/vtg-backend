const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('workspace guard shows the white full-logo loader with a circling red line, not the black text screen',()=>{
 const g=read('vtg-agreement-guard.js');
 assert.doesNotMatch(g,/Securing your VTG workspace/);
 assert.doesNotMatch(g,/#17191b/);
 assert.match(g,/background:#fff/);
 assert.match(g,/class="r"[^>]*pathLength="100"/);
 assert.match(g,/vtgGSpin/);assert.match(g,/TRADE GLOBAL/);assert.match(g,/AFRICA TRADE PLATFORM/);
 const l=read('vtg-loader.js'),c=read('vtg-loader.css');
 assert.match(l,/vtg-v-ring/);assert.match(l,/TRADE GLOBAL/);assert.match(c,/@keyframes vtgSpin/);
 assert.match(c,/prefers-reduced-motion/);
});

test('dashboard atlas shows only the user\'s own routes; the public atlas keeps every place',()=>{
 const d=read('vtg-shipment-globe.js');
 assert.doesNotMatch(d,/globePoints\(\)|addToLeaflet/,'dashboards must not draw the all-places layer');
 assert.match(d,/pathsData/);assert.match(d,/htmlElementsData/);
 assert.match(d,/openPlace\(r\.from\)/);assert.match(d,/openPlace\(r\.to\)/);
 const a=read('vtg-buyer-atlas.js');
 assert.match(a,/buyer-dashboard\|supplier-dashboard\|bank-trade-os/);
 const t=read('trade-atlas.html');
 assert.match(t,/globePoints\(\)/);assert.match(t,/addToLeaflet/);
 assert.match(t,/pointRadius\(d=>d\.r\|\|\(d\.type==='Sea port' \? \.06 : \.05\)\)/);
});

test('sea lanes: China to Lagos goes round the Cape and the ship runs origin to destination',()=>{
 const src=read('vtg-shipment-globe.js');
 const a=src.indexOf('/* ---- sea lanes'),b=src.indexOf('const SHIP_SVG');
 assert.ok(a>0&&b>a);
 const api=new Function(src.slice(a,b)+';return {buildLane,laneAt,seaWaypoints};')();
 const sha={name:'Shanghai',lat:31.23,lng:121.47},lag={name:'Lagos',lat:6.45,lng:3.36};
 const lane=api.buildLane({from:sha,to:lag});
 const near=(lat,lng,deg)=>lane.pts.some(p=>Math.hypot(p[0]-lat,p[1]-lng)<deg);
 assert.ok(near(1.3,104,3),'passes Singapore strait');
 assert.ok(near(-35.4,21,3),'passes Cape Agulhas');
 const s=api.laneAt(lane,0),e=api.laneAt(lane,1);
 assert.ok(Math.abs(s.lat-31.23)<.01&&Math.abs(s.lng-121.47)<.01);
 assert.ok(Math.abs(e.lat-6.45)<.01&&Math.abs(e.lng-3.36)<.01);
 const back=api.buildLane({from:lag,to:sha});
 assert.ok(Math.abs(back.pts[0][0]-6.45)<.01,'reverse lane starts at Lagos');
 const nan=api.buildLane({from:{lat:6.45,lng:3.36},to:{lat:6.43,lng:3.55}});
 assert.ok(nan.pts.length>=2&&nan.pts.every(p=>isFinite(p[0])&&isFinite(p[1])));
 const mid=api.laneAt(lane,.5);assert.ok(mid.lat<10,'halfway is in the southern/ Indian Ocean, not over Asia');
});

test('port photos must show shipping or an airport',()=>{
 const g=read('vtg-port-gallery.js');
 const grab=n=>g.match(new RegExp('const '+n+'=(\\/.*\\/i);'))[1];
 const SEA=eval(grab('SEA_OK')),AIR=eval(grab('AIR_OK')),OFF=eval(grab('OFF_TOPIC'));
 const rel=(t,k)=>!OFF.test(t)&&(k==='A'?AIR:SEA).test(t);
 assert.ok(rel('Apapa Port container terminal cranes','S'));
 assert.ok(rel('Tin Can Island Port berth with cargo ship','S'));
 assert.ok(rel('Murtala Muhammed International Airport apron aircraft','A'));
 assert.ok(rel('Lagos airport runway at sunset','A'));
 assert.ok(!rel('Lagos street food market','S'));
 assert.ok(!rel('Portrait of a smiling man in Lagos','S'));
 assert.ok(!rel('Wedding party in Ibadan','A'));
 assert.match(g,/Categories/);
});

test('selecting a place zooms the globe and map in, then opens its details',()=>{
 const g=read('vtg-port-gallery.js');
 assert.match(g,/function zoomOpen/);assert.match(g,/altitude:\.3/);assert.match(g,/flyTo\(\[lat,lon\],10/);
 assert.match(read('trade-atlas.html'),/zoomOpen\(d\.place,\{globe,map:atlasMap\}\)/);
 assert.match(read('vtg-shipment-globe.js'),/zoomOpen\(\{name:pl\.name,lat:pl\.lat,lng:pl\.lng\},\{globe,map\}\)/);
 assert.match(g,/vtgpg:v2:/);assert.match(g,/prop=images/);
});
test('Google button checks the provider first and explains a switched-off provider',()=>{
 const a=read('vtg-supabase-auth.js');
 assert.match(a,/skipBrowserRedirect: true/);assert.match(a,/redirect: 'manual'/);assert.match(a,/not switched on/);
});
