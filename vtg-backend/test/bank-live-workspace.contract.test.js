'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..','..');const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=rd('supabase/migrations/20261119060000_vtg_bank_live_workspace.sql');
const page=rd('bank-trade-os.html'),js=rd('vtg-bank-live.js'),buyer=rd('vtg-buyer-lc-drafts-supabase.js');

test('bank workspace RPCs are role-checked, search_path pinned and not callable by anon',()=>{
  for(const fn of ['vtg_buyer_submit_lc_request','vtg_bank_workspace_overview']){
    assert.match(sql,new RegExp('revoke all on function public\\.'+fn+'\\([^)]*\\) from public, anon'));
    assert.match(sql,new RegExp('grant execute on function public\\.'+fn+'\\([^)]*\\) to authenticated'));
  }
  assert.equal((sql.match(/set search_path = ''/g)||[]).length,3);
  assert.match(sql,/An active verified bank trade account is required/);
  assert.match(sql,/Choose a verified bank/);
  assert.match(sql,/already been sent to a bank/);
});
test('banks may update only status and updated_at; no secrets or contact details are returned',()=>{
  assert.match(sql,/grant update \(status, updated_at\) on public\.letters_of_credit to authenticated/);
  assert.doesNotMatch(sql,/provider_reference|idempotency_key|\.email|\.phone/);
});
test('buyer notified on review and can read own review history; one LC per draft',()=>{
  assert.match(sql,/vtg_notify_buyer_of_lc_review/);
  assert.match(sql,/buyers read review events of their own lcs/);
  assert.match(sql,/letters_of_credit_source_draft_uidx/);
});
test('order status gate compares as text so it works on every environment enum',()=>{
  assert.match(sql,/o\.status::text not in \('confirmed','processing','in_production'/);
});
test('bank page is live: no demo data, local case storage or preview records',()=>{
  assert.match(page,/vtg-bank-live\.js/);
  assert.doesNotMatch(page,/vtg-bank-trade-supabase\.js/);
  assert.doesNotMatch(page,/DEMO RECORDS|VTG-TF-DEMO|sampleCases|vtg-bank-finance-cases|Prototype \/ demo/);
  assert.match(page,/pendingBusinessVerification\)\{location\.replace\('\/application-received\.html\?role=bank'\)/);
  for(const id of ['recentRows','actionQueue','caseRows','lcList','docQueue','paymentRows','fxBody','shipList','riskList','auditList','bankProfileLive','caseDetails'])assert.match(page,new RegExp('id="'+id+'"'),id);
});
test('bank script reads one RPC, records reviews through the RPC and never writes tables or issues LCs',()=>{
  assert.match(js,/rpc\('vtg_bank_workspace_overview'\)/);
  assert.match(js,/rpc\('vtg_bank_review_lc'/);
  assert.doesNotMatch(js,/\.from\('letters_of_credit'\)|\.insert\(|\.update\(|localStorage|service_role/);
  assert.match(js,/createSignedUrl\(path,60\)/);
  assert.match(js,/does not issue|never issues/i);
});
test('buyer can send a draft to a verified bank and sees its status',()=>{
  assert.match(buyer,/rpc\('vtg_buyer_submit_lc_request'/);
  assert.match(buyer,/vtg_verified_network_directory/);
  assert.match(buyer,/data-lc-send/);
});
