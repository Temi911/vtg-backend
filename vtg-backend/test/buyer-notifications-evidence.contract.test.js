const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const sql=fs.readFileSync(path.resolve(__dirname,'..','..','supabase/migrations/20261116100000_vtg_notifications_and_inspection_evidence_access.sql'),'utf8');
test('notifications table is private to its owner and users can only mark read',()=>{
 assert.match(sql,/create table if not exists public\.vtg_notifications/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/grant update \(read_at\) on public\.vtg_notifications to authenticated/);
 assert.doesNotMatch(sql,/grant (insert|delete|all)[^;]*vtg_notifications to authenticated/);
 assert.match(sql,/using \(user_id = \(select auth\.uid\(\)\)\)/);
});
test('inspection evidence is readable only by the requesting buyer, the inspector or an admin',()=>{
 assert.match(sql,/r\.requested_by = \(select auth\.uid\(\)\) or r\.inspector_id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/private\.vtg_is_admin\(\)/);
 assert.doesNotMatch(sql,/grant (insert|update|delete)[^;]*vtg_inspection_evidence to authenticated/);
});
