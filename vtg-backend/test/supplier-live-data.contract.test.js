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
test('supplier page does not claim records are only stored in the browser',()=>{
  assert.doesNotMatch(html,/<small>Local entries<\/small>/);
  assert.doesNotMatch(html,/已保存至此浏览器|이 브라우저에 저장|Enregistré dans ce navigateur|enregistrées dans ce navigateur/);
});
test('supplier RFQs page lets suppliers answer real buyer quote requests',()=>{
  assert.match(html,/id="liveQuotesRows"/);
  assert.match(html,/id="liveQuotesNotice"/);
  assert.match(html,/vtg-supplier-quotes-supabase\.js/);
  const mod=fs.readFileSync(path.join(root,'vtg-supplier-quotes-supabase.js'),'utf8');
  assert.match(mod,/update\(changes\)\.eq\('id',id\)\.eq\('supplier_id',supplierId\)\.eq\('status','requested'\)/);
});
