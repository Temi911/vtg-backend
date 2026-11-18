const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');const exists=f=>fs.existsSync(path.join(root,f));
test('map and globe libraries are bundled with the site (no CDN, no keys)',()=>{
  for(const f of ['vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css','vendor/leaflet/images/marker-icon.png','vendor/globe/globe.gl.min.js','vendor/globe/earth-blue-marble.jpg','vendor/globe/earth-night.jpg','vendor/globe/night-sky.png','vendor/world-110m.geojson'])assert.ok(exists(f),f);
  const g=JSON.parse(read('vendor/world-110m.geojson'));assert.ok(g.features.length>150);
});
test('every map and globe loads the bundled libraries, never unpkg/jsdelivr first',()=>{
  for(const f of ['trade-atlas.html','vtg-map-atlas-ui.js','vtg-buyer-atlas.js','vtg-shipment-globe.js']){
    const s=read(f);
    assert.ok(!/unpkg\.com\/(leaflet|globe\.gl|three-globe)/.test(s),f+' still pulls from unpkg');
  }
  assert.ok(read('trade-atlas.html').includes('/vendor/leaflet/leaflet.js'));
  assert.ok(read('trade-atlas.html').includes('/vendor/globe/globe.gl.min.js'));
});
test('maps use the shared keyless basemap chain and an always-on vector world',()=>{
  const c=read('vtg-map-core.js');
  for(const p of ['tile.openstreetmap.org','basemaps.cartocdn.com','server.arcgisonline.com'])assert.ok(c.includes(p),p);
  assert.ok(c.includes('/vendor/world-110m.geojson'));
  assert.ok(!/api[_ -]?key/i.test(c.replace(/never needed|No API keys are ever needed/g,'')),'no key requirement in map core');
  for(const f of ['trade-atlas.html','vtg-map-atlas-ui.js','vtg-buyer-atlas.js','vtg-shipment-globe.js'])assert.ok(read(f).includes('VTGMap'),f);
});
test('no map message tells users an API key or tile service is required',()=>{
  for(const f of ['trade-atlas.html','vtg-map-atlas-ui.js','vtg-buyer-atlas.js','vtg-shipment-globe.js','vtg-map-core.js'])
    assert.ok(!/requires a public map library|Open OpenStreetMap|needs? an? API key/i.test(read(f)),f);
});
test('globes share one space scene: stars in both modes, sunlit Earth in light mode',()=>{
  const s=read('vtg-space.js');
  assert.ok(s.includes('earth-blue-marble.jpg')&&s.includes('night-sky.png')&&s.includes('earth-night.jpg'));
  assert.match(s,/backgroundImageUrl\(A\.sky\)/);       // stars in light AND dark
  assert.ok(s.includes('sunglow')&&s.includes('moon')&&s.includes('shoot')&&s.includes('prefers-reduced-motion'));
  for(const f of ['trade-atlas.html','vtg-shipment-globe.js'])assert.ok(read(f).includes('VTGSpace.attach'),f);
  assert.ok(!read('trade-atlas.html').includes("#edf4f8")&&!read('vtg-shipment-globe.js').includes("#edf4f8"),'old white globe background removed');
});

test('Nigeria port Atlas markers expose official NPA facility references and shipping-position links',()=>{
  const page=read('trade-atlas.html');
  for(const item of [
    'sourceAuthority:"Nigerian Ports Authority"',
    'https://nigerianports.gov.ng/tincan/',
    'https://nigerianports.gov.ng/lagos-port/',
    'https://nigerianports.gov.ng/lekki/',
    'https://nigerianports.gov.ng/daily-shipping-position/',
    'Official facility profile',
    'NPA daily shipping position'
  ])assert.ok(page.includes(item),item);
});
