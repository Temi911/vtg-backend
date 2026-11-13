const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'supplier-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'vtg-supplier-orders-supabase.js'),'utf8');
test('supplier Live VTG orders panel loads orders owned by the signed-in supplier',()=>{
 assert.match(html,/id="liveOrdersRows"/);
 assert.match(html,/vtg-supplier-orders-supabase\.js/);
 assert.match(js,/from\('trade_orders'\)/);
 assert.match(js,/\.eq\('supplier_id',userId\)/);
 assert.match(js,/p\.role!=='supplier'/);
 assert.doesNotMatch(js,/fetch\s*\(|localStorage/);
});
