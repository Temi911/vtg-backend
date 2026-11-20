const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrations/20261115120000_vtg_user_id.sql');

test('every profile gets a permanent unique VTG user ID',()=>{
 assert.match(sql,/create sequence if not exists public\.vtg_user_id_seq start 100001/);
 assert.match(sql,/order by created_at, id/);
 assert.match(sql,/set default \('VTG-' \|\| lpad\(nextval/);
 assert.match(sql,/set not null/);assert.match(sql,/create unique index if not exists profiles_vtg_user_id_key/);
 assert.match(sql,/new\.vtg_user_id := old\.vtg_user_id/);
 assert.match(sql,/revoke all on sequence public\.vtg_user_id_seq from anon, authenticated/);
});
test('auth reads the ID tolerantly and the three dashboards display it',()=>{
 const a=read('vtg-supabase-auth.js');
 assert.match(a,/select\('vtg_user_id'\)/);assert.doesNotMatch(a.match(/\.select\('id,email,full_name[^']*'\)/)[0],/vtg_user_id/);
 for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'])assert.match(read(f),/vtg-user-id\.js/,f);
 const u=read('vtg-user-id.js');assert.match(u,/\^VTG-\\d\{6,\}\$/);assert.doesNotMatch(u,/innerHTML/);
});
test('user ID also appears as a pill in the shared top bar, hidden on phones',()=>{
  const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
  const js=fs.readFileSync(path.join(__dirname,'..','..','vtg-user-id.js'),'utf8');
  assert.match(js,/querySelector\('\.vf-controls'\)/);
  assert.match(js,/vtg-uid--bar/);
  assert.match(js,/@media\(max-width:760px\)\{\.vtg-uid--bar\{display:none\}\}/);
});
test('staff dashboards load the user ID script and have a floating fallback',()=>{
  const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
  const root=path.join(__dirname,'..','..');
  for(const f of ['workforce-dashboard.html','agent-dashboard.html','agent-network-dashboard.html','admin-dashboard.html','vtg-ai-dashboard.html']){
    assert.match(fs.readFileSync(path.join(root,f),'utf8'),/vtg-user-id\.js/,f);
  }
  const js=fs.readFileSync(path.join(root,'vtg-user-id.js'),'utf8');
  assert.match(js,/vtg-uid--float/);
  assert.match(js,/getClientRects\(\)\.length/);
});
