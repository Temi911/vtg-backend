const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const migration=read('supabase/migrations/20261123190000_vtg_structured_rfq_publishing.sql');
const policyFix=read('supabase/migrations/20261123191000_vtg_qualified_rfq_read_policy.sql');
const buyer=read('vtg-buyer-rfq-workflow.js');
const supplier=read('vtg-supplier-shared-trade-desk-supabase.js');
const dashboard=read('buyer-dashboard.html');

test('RFQ publish RPC is authenticated, buyer-scoped and generates a shared reference',()=>{
 assert.match(migration,/create or replace function public\.vtg_publish_buyer_rfq/);
 assert.match(migration,/security definer/i);
 assert.match(migration,/auth\.uid\(\)/);
 assert.match(migration,/p\.role='buyer'/);
 assert.match(migration,/VTG-RFQ-/);
 assert.match(migration,/revoke all on function public\.vtg_publish_buyer_rfq\(jsonb,uuid\[\]\) from public,anon/i);
 assert.match(migration,/grant execute on function public\.vtg_publish_buyer_rfq\(jsonb,uuid\[\]\) to authenticated/i);
});

test('open-market and targeted RFQs are limited to qualified matching suppliers',()=>{
 assert.match(policyFix,/buyer_trade_requests\.audience in \('open_market','both'\)/);
 assert.match(policyFix,/buyer_rfq_targets/);
 assert.match(policyFix,/sp\.verification_status='verified'/);
 assert.match(policyFix,/sp\.verification_expires_at is null or sp\.verification_expires_at>now\(\)/);
 assert.match(policyFix,/pr\.is_active=true and pr\.is_verified=true and pr\.review_status='approved'/);
 assert.match(migration,/create table if not exists public\.buyer_rfq_targets/);
 assert.match(migration,/qualified suppliers submit quotations to eligible RFQs/);
});

test('buyer RFQ workspace saves private drafts and publishes through the single Supabase RPC',()=>{
 assert.match(dashboard,/name="quotation_deadline"/);
 assert.match(dashboard,/name="required_certifications"/);
 assert.match(dashboard,/name="audience"/);
 assert.match(dashboard,/id="publishRfqBtn"/);
 assert.match(buyer,/from\('buyer_rfq_drafts'\)\.insert\(payload\)/);
 assert.match(buyer,/rpc\('vtg_publish_buyer_rfq'/);
 assert.match(buyer,/VTG-RFQ/); // reference is displayed from the server result
 assert.doesNotMatch(buyer,/SERVICE_ROLE|service_role/);
});

test('supplier workspace renders structured RFQ requirements and uses existing quote workflow',()=>{
 assert.match(supplier,/quotation_deadline/);
 assert.match(supplier,/required_certifications/);
 assert.match(supplier,/destination_port/);
 assert.match(supplier,/from\('supplier_trade_quotations'\)\.insert/);
});

test('new browser RFQ scripts parse as JavaScript',()=>{
 assert.doesNotThrow(()=>new vm.Script(buyer));
 assert.doesNotThrow(()=>new vm.Script(supplier));
});
