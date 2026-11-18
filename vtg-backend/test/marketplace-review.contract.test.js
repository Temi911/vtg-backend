const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const sql=fs.readFileSync(path.join(__dirname,'..','..','supabase/migrations/20261118090000_vtg_marketplace_product_review.sql'),'utf8');
test('marketplace review migration keeps approval staff-only and the catalogue approved-only',()=>{
  assert.match(sql,/review_status in \('pending','approved','rejected'\)/);
  assert.match(sql,/grant select \(review_status, review_note, reviewed_at\) on public\.products to authenticated/);
  assert.ok(!/grant (insert|update)[^;]*review_status/i.test(sql),'suppliers must not get write access to review fields');
  assert.match(sql,/private\.vtg_is_admin\(\)/);
  assert.match(sql,/revoke all on function public\.vtg_review_product\(uuid, text, text\) from public, anon/);
  assert.match(sql,/revoke all on function public\.vtg_admin_product_queue\(text\) from public, anon/);
  assert.match(sql,/p\.is_active and p\.is_verified and p\.review_status = 'approved'/);
  assert.match(sql,/Please give the supplier a reason/);
});
