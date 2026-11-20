'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..','..');const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=rd('supabase/migrations/20261120090000_vtg_supplier_shipments_documents_lc_visibility.sql');
const chain=rd('vtg-supplier-trade-chain.js'),sup=rd('supplier-dashboard.html'),buyer=rd('buyer-dashboard.html'),lcStatus=rd('vtg-buyer-lc-status.js');
const admin=rd('admin-product-review.html'),products=rd('vtg-supplier-products-supabase.js'),panels=rd('vtg-supplier-linked-panels.js');

test('supplier shipment and document RPCs are supplier-only, pinned and not callable by anon',()=>{
  assert.match(sql,/revoke all on function public\.vtg_supplier_save_shipment\([^)]*\) from public, anon/);
  assert.match(sql,/grant execute on function public\.vtg_supplier_save_shipment\([^)]*\) to authenticated/);
  assert.match(sql,/revoke all on function public\.vtg_supplier_add_order_document\([^)]*\) from public, anon/);
  assert.equal((sql.match(/set search_path = ''/g)||[]).length,3);
  assert.equal((sql.match(/An active supplier trade account is required/g)||[]).length,2);
  assert.match(sql,/supplier_id = v_uid/);
});
test('shipment order gate compares as text and only moves the order to shipped',()=>{
  assert.match(sql,/o\.status::text not in \('confirmed','processing','in_production'/);
  assert.match(sql,/set status = 'shipped'/);
});
test('supplier documents must live in the supplier folder; buyers and banks are notified',()=>{
  assert.match(sql,/split_part\(p_storage_path, '\/', 1\) <> v_uid::text/);
  assert.match(sql,/storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  assert.match(sql,/order participants read order documents/);
  assert.match(sql,/'shipment_update'/);assert.match(sql,/'order_document'/);
});
test('bank decisions reach the supplier too',()=>{
  assert.match(sql,/suppliers read review events of lcs on their orders/);
  assert.match(sql,/lc\.supplier_id is distinct from lc\.buyer_id/);
});
test('supplier page uses the live shipment and document RPCs, no secrets or direct shipments writes',()=>{
  assert.match(sup,/vtg-supplier-trade-chain\.js/);
  assert.match(chain,/rpc\('vtg_supplier_save_shipment'/);assert.match(chain,/rpc\('vtg_supplier_add_order_document'/);
  assert.doesNotMatch(chain,/from\('shipments'\)\.(insert|update|upsert)|service_role|localStorage/);
  assert.doesNotMatch(sup,/Publishing integration not connected/);
});
test('buyer sees bank responses read-only',()=>{
  assert.match(buyer,/vtg-buyer-lc-status\.js/);
  assert.match(lcStatus,/vtg_bank_lc_review_events/);
  assert.doesNotMatch(lcStatus,/\.insert\(|\.update\(|\.upsert\(|localStorage/);
  assert.match(panels,/Bank note/);
});
test('product review: supplier sees status, staff queue uses the existing RPCs',()=>{
  assert.match(products,/review_status/);assert.match(products,/IN REVIEW/);
  assert.match(admin,/vtg_admin_product_queue/);assert.match(admin,/vtg_review_product/);
  assert.match(admin,/give the supplier a reason/);assert.doesNotMatch(admin,/service_role/);
});
