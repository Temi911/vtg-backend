const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const src=stripTypeScriptTypes(read('supabase/functions/_shared/vtg-welcome.ts')).replace(/export /g,'');
const api=new Function(src+';return {buildWelcomeEmail,userIdSentence,formatOpenedDate};')();

test('welcome email carries the VTG user ID, account details and role-specific steps',()=>{
 const m=api.buildWelcomeEmail({role:'buyer',fullName:'Ada Obi',email:'ada@example.com',userId:'VTG-100042',openedAt:'2026-11-16T10:00:00Z'});
 assert.match(m.subject,/VTG-100042/);
 assert.equal(m.highlight.value,'VTG-100042');
 assert.match(m.body,/Dear Ada Obi,/);assert.match(m.body,/Account type: Buyer/);assert.match(m.body,/Registered email: ada@example.com/);
 assert.match(m.body,/Account opened: 16 November 2026/);
 assert.match(m.body,/quote it whenever you contact VTG support/);assert.match(m.body,/request for quotation/);
 assert.match(m.body,/never ask for your password/);
 const s=api.buildWelcomeEmail({role:'supplier',userId:'VTG-100043'});assert.match(s.body,/Shared Trade Desk/);assert.doesNotMatch(s.body,/Dear undefined|null/);
});
test('works on older databases without a user ID, and for unknown roles',()=>{
 const m=api.buildWelcomeEmail({role:'weird',fullName:'',userId:null});
 assert.equal(m.highlight,undefined);assert.doesNotMatch(m.body,/User ID/);assert.match(m.body,/Dear there,/);assert.match(m.subject,/^Welcome to VTG/);
});
test('e-mail function and approval flow use it; highlight is escaped in HTML',()=>{
 const e=read('supabase/functions/vtg-email/index.ts');
 assert.match(e,/buildWelcomeEmail/);assert.match(e,/select\("vtg_user_id"\)/);assert.match(e,/highlight,/);
 assert.match(e,/escapeHtml\(input\.highlight\.value\)/);
 assert.match(read('supabase/functions/_shared/vtg-email.ts'),/escapeHtml\(input\.highlight\.value\)/);
 const a=read('supabase/functions/vtg-admin-roles/index.ts');assert.match(a,/vtg_user_id/);assert.match(a,/highlight: approved/);
});
