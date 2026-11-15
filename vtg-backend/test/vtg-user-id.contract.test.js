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
