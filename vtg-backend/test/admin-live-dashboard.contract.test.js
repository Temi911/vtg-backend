'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..','..');const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=rd('supabase/migrations/20261121090000_vtg_admin_live_dashboard.sql');
const html=rd('admin-dashboard.html'),js=rd('vtg-admin-live.js'),stub=rd('admin-dashboard-preview.html');
const publicFns=['vtg_admin_overview()','vtg_admin_trade_exceptions()','vtg_admin_verification_queue()','vtg_admin_finance_overview()','vtg_admin_settings_snapshot()','vtg_admin_audit_list(integer, text)','vtg_admin_record_note(text, text, text, uuid)'];

test('every admin function gates on the administrator role, pins search_path and is closed to anon',()=>{
  for(const f of publicFns){assert.ok(sql.includes('revoke all on function public.'+f+' from public, anon'),f+' revoke');assert.ok(sql.includes('grant execute on function public.'+f+' to authenticated'),f+' grant')}
  assert.equal((sql.match(/perform private\.vtg_admin_gate\(\)/g)||[]).length,publicFns.length);
  assert.match(sql,/Administrator access required/);
  assert.equal((sql.match(/create or replace function public\.vtg_admin_/g)||[]).length,publicFns.length);
  const defs=sql.split('create or replace function').slice(1);
  for(const d of defs)assert.match(d.split('$$;')[0],/set search_path = ''|set search_path = ''/);
});
test('audit trail is RLS-only, append-only, with before/after triggers',()=>{
  assert.match(sql,/alter table public\.audit_events enable row level security/);
  assert.match(sql,/revoke all on public\.audit_events from anon, authenticated/);
  assert.match(sql,/before update or delete on public\.audit_events/);
  for(const t of ['vtg_audit_product_review','vtg_audit_verification_review','vtg_audit_role_request_review'])assert.ok(sql.includes('create trigger '+t));
  assert.match(sql,/'from', old\.status, 'to', new\.status/);
});
test('finance overview is read-only and never returns provider references',()=>{
  const fin=sql.split('vtg_admin_finance_overview()')[1].split('$$;')[0];
  assert.doesNotMatch(fin,/provider_reference|idempotency_key|metadata/);
  assert.doesNotMatch(fin,/\b(insert|update|delete)\b/i);
});
test('exceptions compare statuses as text so one function works on every environment',()=>{
  assert.match(sql,/lc\.status::text in \('requested','under_review','documents_requested'\)/);
  assert.match(sql,/o\.status::text in \('confirmed','processing','in_production'\)/);
});
test('admin page: staff-only, live containers, no sample markers or browser-only audit',()=>{
  assert.match(js,/role !== 'admin'/);assert.match(js,/admin-signin\.html/);
  for(const f of ['vtg_admin_overview','vtg_admin_trade_exceptions','vtg_admin_verification_queue','vtg_admin_finance_overview','vtg_admin_audit_list','vtg_admin_settings_snapshot','vtg_admin_record_note','vtg_admin_review_verification_document'])assert.ok(js.includes("'"+f+"'"),f);
  assert.doesNotMatch(js,/localStorage|service_role|\.insert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(html,/Sample data|Illustrative|PREVIEW MODE|fabricated|Demonstration records/);
  assert.match(html,/vtg-admin-live\.js/);assert.match(html,/id="staffInviteForm"/);
  assert.match(js,/required: true/);
});
test('old preview URL only redirects to the live page',()=>{
  assert.match(stub,/admin-dashboard\.html/);assert.ok(stub.length<1200);
});
