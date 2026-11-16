const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'supplier-dashboard.html'),'utf8');
const globe=fs.readFileSync(path.join(root,'vtg-shipment-globe.js'),'utf8');
test('supplier overview counts real orders, requests and quotes',()=>{
  assert.match(html,/from\('trade_orders'\)\.select\('id,status'\)\.eq\('supplier_id'/);
  assert.match(html,/from\('buyer_trade_requests'\)/);
  assert.match(html,/from\('supplier_trade_quotations'\)\.select\('id,status'\)\.eq\('supplier_id'/);
  assert.match(html,/live\?live\.activeOrders:state\.orders\.length/);
  assert.match(html,/live\?live\.quotes:state\.rfqs\.length/);
});
test('supplier map reads real shipments, not localStorage',()=>{
  assert.doesNotMatch(globe,/vtg-supplier-os-shipments-v2/);
  assert.match(globe,/eq\(role\+'_id',session\.user\.id\)/);
  assert.match(globe,/role==='buyer'\|\|role==='supplier'/);
});
test('bank map reads shipments on its assigned letters of credit, not localStorage',()=>{
  assert.doesNotMatch(globe,/vtg-bank-finance-cases-v2/);
  assert.match(globe,/from\('letters_of_credit'\)\.select\('order_id'\)\.eq\('bank_id',uid\)/);
  assert.match(globe,/verification_status!=='verified'/);
});
