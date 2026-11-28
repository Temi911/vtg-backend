const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('dashboard popups sit above the shared header (z-index 9998)',()=>{
 const css=read('vtg-dash.css');
 assert.match(css,/buyerProductModal[^{]*\{z-index:10000!important\}/);
 const m=css.match(/\.modal-backdrop/);assert.ok(m);
 assert.match(read('vtg-dashboard-footer.js'),/9998/);
});
test('staff-style dashboards without the shared header have no phantom 64px offset',()=>{
 for(const f of ['admin-dashboard.html','agent-dashboard.html','agent-network-dashboard.html','workforce-dashboard.html'])
  assert.match(read(f),/html:root\{--vf-h:0px\}/,f);
});
test('admin header is sticky on desktop and phone',()=>{
 const h=read('admin-dashboard.html');
 assert.match(h,/min-width:681px\)\{body \.topbar\{position:sticky!important;top:0!important/);
 assert.match(h,/max-width:680px\)\{body \.sidebar\{height:auto!important/);
});
test('dashboards load the refreshed vtg-dash.css',()=>{
 for(const f of ['admin-dashboard.html','buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html','workforce-dashboard.html','agent-dashboard.html','agent-network-dashboard.html','vtg-ai-dashboard.html'])
  assert.match(read(f),/vtg-dash\.css\?v=20261127-overlay-1/,f);
});
