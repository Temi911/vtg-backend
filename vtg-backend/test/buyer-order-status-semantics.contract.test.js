const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const overview=read('vtg-buyer-overview-supabase.js');
const orders=read('vtg-buyer-orders-supabase.js');
const html=read('buyer-dashboard.html');

test('buyer overview values only confirmed trade orders, not pending quote requests',()=>{
 assert.match(overview,/pendingQuoteOrders=orders\.filter/);
 assert.match(overview,/confirmedOrders=orders\.filter/);
 assert.match(overview,/confirmedOrders\.forEach/);
 assert.match(overview,/Trade value includes confirmed orders only/);
 assert.match(html,/Confirmed trade value/);
});

test('buyer orders distinguish pending quotation requests from confirmed purchases',()=>{
 assert.match(orders,/QUOTE REQUEST PENDING/);
 assert.match(orders,/Supplier price not agreed/);
 assert.match(orders,/Quote request · /);
 assert.match(orders,/Shipment tracking becomes relevant after the supplier quotation is accepted/);
 assert.match(html,/Trade records/);
});
