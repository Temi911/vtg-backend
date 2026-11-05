const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'buyer-dashboard.html'),'utf8');
const client=fs.readFileSync(path.join(root,'vtg-buyer-lc-drafts-supabase.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261105190000_buyer_lc_request_drafts.sql'),'utf8');

test('buyer LC workspace loads existing buyer-owned orders from Supabase',()=>{
 assert.match(html,/vtg-buyer-lc-drafts-supabase\.js/);
 assert.match(html,/id="refreshLcOrders"/);
 assert.match(client,/from\('trade_orders'\)/);
 assert.match(client,/\.eq\('buyer_id',buyerId\)/);
 assert.match(client,/Unable to load orders — use Refresh to try again/);
 assert.doesNotMatch(client,/fetch\s*\(|\/api\/orders|\/api\/lc/);
});

test('LC preparation drafts require an existing order and persist to buyer-owned Supabase storage',()=>{
 assert.match(client,/from\('buyer_lc_request_drafts'\)\.insert/);
 assert.match(client,/order_id:x\.orderId/);
 assert.match(client,/Select an existing VTG purchase order/);
 assert.match(client,/has not been sent to a bank and no LC has been issued/);
 assert.match(migration,/enable row level security/i);
 assert.match(migration,/references public\.trade_orders\(id\)/i);
 assert.match(migration,/p\.role='buyer'::public\.vtg_account_role and p\.is_active=true/i);
 assert.match(migration,/o\.id=order_id and o\.buyer_id=\(select auth\.uid\(\)\)/i);
 assert.match(migration,/status text not null default 'draft' check \(status = 'draft'\)/i);
});
