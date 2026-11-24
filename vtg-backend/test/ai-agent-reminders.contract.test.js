const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('dashboard AI can set, list and cancel reminders and knows the current time and zone',()=>{
  const ts=read('supabase/functions/vtg-ai-assistant/index.ts');
  for(const n of ['set_reminder','list_reminders','cancel_reminder'])assert.ok(ts.includes('"'+n+'"'),n);
  assert.match(ts,/AGENT MODE AND INTELLIGENCE/);assert.match(ts,/CURRENT TIME/);
  assert.match(ts,/from\("vtg_reminders"\)\.insert\(\{ user_id: userId/);
  assert.match(ts,/\.eq\("user_id", userId\)/);
});
test('reminder table is owner-scoped and fires into notifications',()=>{
  const sql=read('supabase/migrations/20261124110000_vtg_reminders.sql');
  assert.match(sql,/enable row level security/);assert.match(sql,/user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql,/revoke all on function public\.vtg_fire_due_reminders\(\) from public, anon/);
  assert.match(sql,/insert into public\.vtg_notifications/);
});
test('dashboards load the reminder pop-up and the AI receives the browser time zone',()=>{
  for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html','vtg-ai-dashboard.html'])assert.match(read(f),/vtg-reminders\.js/,f);
  assert.match(read('vtg-reminders.js'),/vtg_fire_due_reminders/);
  assert.match(read('vtg-dashboard-chat.js'),/timezone:/);assert.match(read('vtg-ai-dashboard.html'),/timezone:/);
  assert.doesNotMatch(read('vtg-reminders.js'),/service_role/);
});
