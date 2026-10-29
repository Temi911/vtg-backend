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
  assert.match(renderer, /https:\/\/www\.openstreetmap\.org\//);
  assert.doesNotMatch(renderer, /cartocdn\.com|tile\.openstreetmap\.de/);
  assert.match(renderer, /classList\.contains\('open'\)\)open\(\)/);
  assert.doesNotMatch(renderer, /maplibre-gl|mapbox|tiles\.openfreemap|maps\.googleapis\.com/);
});

test('public Trade Atlas uses Leaflet, official OSM tiles, and a graceful tile-error state', () => {
  const page = read('trade-atlas.html');
  assert.match(page, /leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.match(page, /tile\.openstreetmap\.org/);
  assert.match(page, /https:\/\/www\.openstreetmap\.org\//);
  assert.doesNotMatch(page, /cartocdn\.com|tile\.openstreetmap\.de/);
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
  assert.match(renderer, /https:\/\/www\.openstreetmap\.org\//);
  assert.doesNotMatch(renderer, /cartocdn\.com|tile\.openstreetmap\.de/);
  assert.match(data, /Tin Can Island/);
  assert.match(data, /Shanghai/);
  assert.match(data, /Busan/);
});

test('shared navigation exposes the three visitor themes', () => {
  const navigation = read('vtg-site-navigation.js');
  const visitorThemes = ['trade-classic', 'ocean-route', 'graphite-port'];
  for (const theme of visitorThemes) {
    assert.ok(navigation.includes("['" + theme + "'"), 'missing theme preset: ' + theme);
  }
  assert.match(navigation, /endsWith\('\/frontend-v3\.html'\)/);
  assert.match(navigation, /endsWith\('\/supplier-dashboard\.html'\)/);
  assert.match(navigation, /data-navkey="ai" href="\/vtg-ai\.html" id="footAi">VTG AI<\/a>/);
  assert.match(navigation, /ai: \['\/vtg-ai\.html', '\/vtg-ai-dashboard\.html'\]/);
});

test('shared interface styles provide distinct light and dark card surfaces and readable text', () => {
  const styles = read('vtg-interface-system.css');
  assert.match(styles, /--vtg-ui-surface:#fff/);
  assert.match(styles, /--vtg-ui-surface:#151c24/);
  assert.match(styles, /--vtg-ui-text:#17212b/);
  assert.match(styles, /--vtg-ui-text:#eef3f6/);
  assert.match(styles, /background-color:var\(--vtg-ui-surface\)/);
  assert.match(styles, /color:var\(--vtg-ui-muted\)/);
});
