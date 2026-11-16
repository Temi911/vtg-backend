const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const js=fs.readFileSync(path.join(root,'vtg-supplier-linked-panels.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261116130000_vtg_supplier_inspection_status.sql'),'utf8');
const html=fs.readFileSync(path.join(root,'supplier-dashboard.html'),'utf8');
test('supplier Quality/Payments pages show live order-linked data',()=>{
  assert.match(js,/rpc\('vtg_supplier_inspections'\)/);
  assert.match(js,/from\('letters_of_credit'\)[\s\S]*eq\('supplier_id'/);
  assert.match(html,/vtg-supplier-linked-panels\.js/);
});
test('inspection RPC hides fees and findings and is supplier-only',()=>{
  assert.doesNotMatch(sql,/buyer_fee_usd|agent_payout_usd|findings|buyer_notes/);
  assert.match(sql,/supplier_id = \(select auth\.uid\(\)\)/);
  assert.match(sql,/revoke all on function public\.vtg_supplier_inspections\(\) from public, anon/);
});
