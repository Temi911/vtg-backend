const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('active Atlas launcher assets exist at the URLs requested by the UI', () => {
  const launcher = read('vtg-ui-repair.js');
  assert.match(launcher, /\/vtg-map-atlas-ui\.js/);
  assert.ok(fs.existsSync(path.join(root, 'vtg-map-atlas-ui.js')), 'active map renderer must not live only in archive/');
  assert.ok(fs.existsSync(path.join(root, 'vtg-trade-atlas.js')), 'active trade data must not live only in archive/');
});

test('workspace Atlas uses a real interactive map and public map tiles without a paid API key', () => {
  const renderer = read('vtg-map-atlas-ui.js');
  assert.match(renderer, /\/vtg-trade-atlas\.js/);
  assert.match(renderer, /vtgLeafletMap/);
  assert.match(renderer, /leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.match(renderer, /tile\.openstreetmap\.org/);
  assert.match(renderer, /basemaps\.cartocdn\.com/);
  assert.match(renderer, /no API key required/i);
  assert.match(renderer, /classList\.contains\('open'\)\)open\(\)/);
  assert.doesNotMatch(renderer, /maplibre-gl|mapbox|tiles\.openfreemap|maps\.googleapis\.com/);
});

test('public Trade Atlas uses Leaflet, real map tiles, and a fallback tile provider', () => {
  const page = read('trade-atlas.html');
  assert.match(page, /leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.match(page, /tile\.openstreetmap\.org/);
  assert.match(page, /basemaps\.cartocdn\.com/);
  assert.match(page, /L\.map\(/);
});

test('Atlas data includes African, Chinese and South Korean trade locations and corridors', () => {
  const data = read('vtg-trade-atlas.js');
  assert.match(data, /Tin Can Island/);
  assert.match(data, /Guangzhou\/Nansha/);
  assert.match(data, /South Korea/);
  assert.match(data, /Nigeria–China/);
  assert.match(data, /VTGTradeAtlasData/);
});

test('buyer dashboard embeds the interactive Atlas renderer and keeps regional map controls', () => {
  const dashboard = read('buyer-dashboard.html');
  const renderer = read('vtg-buyer-atlas.js');
  const data = read('vtg-trade-atlas.js');
  assert.match(dashboard, /id="map" class="vtgBuyerAtlasMap"/);
  assert.match(dashboard, /vtg-buyer-atlas\.js/);
  assert.match(dashboard, /vtg:buyer-map-region/);
  assert.match(renderer, /tile\.openstreetmap\.org/);
  assert.match(renderer, /basemaps\.cartocdn\.com/);
  assert.match(data, /Tin Can Island/);
  assert.match(data, /Shanghai/);
  assert.match(data, /Busan/);
});
