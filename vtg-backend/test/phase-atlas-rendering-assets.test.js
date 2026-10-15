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

test('Atlas renderer loads data and map engine, then initializes an already-open drawer', () => {
  const renderer = read('vtg-map-atlas-ui.js');
  assert.match(renderer, /\/vtg-trade-atlas\.js/);
  assert.match(renderer, /maplibre-gl@5\.13\.0\/dist\/maplibre-gl\.js/);
  assert.match(renderer, /data-vtg-maplibre-css/);
  assert.match(renderer, /VTGInstallTradeAtlas/);
  assert.match(renderer, /classList\.contains\('open'\)\) open\(\)/);
});

test('Atlas data includes African, Chinese and South Korean trade locations and corridors', () => {
  const data = read('vtg-trade-atlas.js');
  assert.match(data, /Tin Can Island/);
  assert.match(data, /Guangzhou\/Nansha/);
  assert.match(data, /South Korea/);
  assert.match(data, /Nigeria–China/);
  assert.match(data, /VTGTradeAtlasData/);
});
