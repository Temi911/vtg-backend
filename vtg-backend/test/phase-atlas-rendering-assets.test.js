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

test('Atlas renderer is self-contained and does not require an external map API key', () => {
  const renderer = read('vtg-map-atlas-ui.js');
  assert.match(renderer, /\/vtg-trade-atlas\.js/);
  assert.match(renderer, /vtgSvgMap/);
  assert.match(renderer, /No API key required/);
  assert.match(renderer, /classList\.contains\('open'\)\)open\(\)/);
  assert.doesNotMatch(renderer, /maplibre-gl|mapbox|tiles\.openfreemap|maps\.googleapis\.com/);
});

test('Atlas data includes African, Chinese and South Korean trade locations and corridors', () => {
  const data = read('vtg-trade-atlas.js');
  assert.match(data, /Tin Can Island/);
  assert.match(data, /Guangzhou\/Nansha/);
  assert.match(data, /South Korea/);
  assert.match(data, /Nigeria–China/);
  assert.match(data, /VTGTradeAtlasData/);
});
