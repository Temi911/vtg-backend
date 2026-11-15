const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sandbox={window:{}};new Function('window',read('vtg-ports-data.js'))(sandbox.window);
const ports=sandbox.window.VTG_PORTS;
const gallery=read('vtg-port-gallery.js');

test('port data covers Africa, China and South Korea with unique ids and valid coordinates',()=>{
 assert.ok(ports.length>1000);
 assert.equal(new Set(ports.map(p=>p.id)).size,ports.length);
 for(const r of ['Africa','China','South Korea'])assert.ok(ports.some(p=>p.r===r&&p.t==='A')&&ports.some(p=>p.r===r&&p.t==='S'),r);
 for(const p of ports){assert.ok(Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180,p.id);assert.ok(p.n,p.id);}
 assert.ok(ports.some(p=>/Murtala Muhammed/.test(p.n)));
});
test('port data does not ship depth soundings the source marks unreliable',()=>{
 assert.ok(!ports.some(p=>'depth' in p||'ch' in p));
});
test('gallery rotates every 4 seconds, is pausable and credits photos',()=>{
 assert.match(gallery,/ROTATE_MS=4000/);
 assert.match(gallery,/vtgpg-pause/);
 assert.match(gallery,/Wikimedia Commons/);
 assert.match(gallery,/safeUrl/);
 assert.doesNotMatch(gallery,/api[_-]?key|service_role/i);
});
for(const [file,hook] of [['trade-atlas.html','openHubGallery'],['vtg-buyer-atlas.js','VTGPortGallery.open'],['vtg-map-atlas-ui.js','VTGPortGallery.open'],['vtg-shipment-globe.js','VTGPortGallery.zoomOpen']]){
 test(file+' opens the gallery on click',()=>assert.match(read(file),new RegExp(hook.replace('.','\\.'))));
}
test('every page with a map loads port data and gallery before the map code',()=>{
 for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html','frontend-v3.html','trade-atlas.html']){
  const h=read(f);assert.ok(h.indexOf('vtg-ports-data.js')>0&&h.indexOf('vtg-port-gallery.js')>h.indexOf('vtg-ports-data.js'),f);}
});
