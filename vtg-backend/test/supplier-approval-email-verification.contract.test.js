const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const migration=read('supabase/migrations/20261118150000_supplier_approval_requires_verified_email.sql');
const edge=read('supabase/functions/vtg-admin-roles/index.ts');
const adminPage=read('admin-role-requests.html');
const signup=read('supplier-signup.html');
test('supplier and bank role decisions require verified email at database level',()=>{
 assert.match(migration,/from auth\.users u where u\.id=req\.user_id/i);
 assert.match(migration,/v_email_confirmed_at is null/i);
 assert.match(migration,/Applicant must verify their email/i);
 assert.match(migration,/p\.role='buyer'/i);
 assert.match(migration,/p\.is_active=true/i);
 assert.match(migration,/p\.account_environment='trade'/i);
});
test('administrator queue marks unverified applicants and locks decisions',()=>{
 assert.match(edge,/admin\.auth\.admin\.getUserById/);
 assert.match(edge,/email_confirmed:/);
 assert.match(adminPage,/r\.email_confirmed\?/);
 assert.match(adminPage,/disabled/);
 assert.match(adminPage,/Email confirmation required before this application can be reviewed/);
});
test('supplier registration records supplier intent but does not grant the role at signup',()=>{
 assert.match(signup,/requested_role:'supplier'/);
 assert.match(signup,/verifySignupCode\(email,code\)/);
 assert.match(signup,/wait for VTG administrator approval/i);
 assert.match(signup,/RECEIPT EMAIL NOT CONFIRMED/);
 assert.match(signup,/Your email address has been verified, but we could not confirm delivery of the separate application receipt email/);
 assert.match(signup,/separate company-document verification process/);
});
