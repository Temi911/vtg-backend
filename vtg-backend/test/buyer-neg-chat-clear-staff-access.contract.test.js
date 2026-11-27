const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const fn=(file,idVar)=>{const line=read(file).split('\n').find(l=>l.startsWith('function messageMarkup('));assert.ok(line,file);
  return new Function('esc',idVar,line+';return messageMarkup;');};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quote={id:'q1',trade_negotiation_messages:[
 {id:'m1',sender_id:'B',body:'Can you do 480?',created_at:'2026-11-25T10:00:00Z',message_type:'message'},
 {id:'m2',sender_id:'S',body:'Yes at 490',created_at:'2026-11-25T10:05:00Z',message_type:'message'},
 {id:'m3',sender_id:'B',body:'Deal',created_at:'2026-11-25T10:06:00Z',message_type:'message'}]};
const rows=html=>[...html.matchAll(/vtg-neg-row (is-self|is-other)" data-message-side="(outgoing|incoming)" style="display:flex;justify-content:(flex-end|flex-start)/g)].map(m=>m.slice(1,4).join('|'));
test('buyer negotiation thread: the buyer is on the right, the supplier on the left',()=>{
  const html=fn('vtg-buyer-shared-trade-desk-supabase.js','buyerId')(esc,'B')(quote,{id:'r1'});
  assert.deepEqual(rows(html),['is-self|outgoing|flex-end','is-other|incoming|flex-start','is-self|outgoing|flex-end']);
});
test('supplier negotiation thread: the supplier is on the right, the buyer on the left',()=>{
  const html=fn('vtg-supplier-shared-trade-desk-supabase.js','supplierId')(esc,'S')(quote,{id:'r1'});
  assert.deepEqual(rows(html),['is-other|incoming|flex-start','is-self|outgoing|flex-end','is-other|incoming|flex-start']);
});
test('negotiation scripts are cache-busted on both dashboards',()=>{
  assert.match(read('buyer-dashboard.html'),/vtg-buyer-shared-trade-desk-supabase\.js\?v=20261125-bubbles-1/);
  assert.match(read('supplier-dashboard.html'),/vtg-supplier-shared-trade-desk-supabase\.js\?v=20261125-bubbles-1/);
});
test('chat clear: one agreement from the other person clears it for everyone, permanently, without a reload',()=>{
  const js=read('vtg-messenger.js'),sql=read('supabase/migrations/20261126090000_vtg_messenger_rebuild.sql');
  assert.match(js,/watch\('vtg_chat_clear_requests'/);assert.match(js,/function popupClear\(req\)/);
  assert.match(js,/r\.status==='approved'[\s\S]*S\.messages=\[\];draw\(\)/);
  assert.match(sql,/delete from public\.messages where conversation_id = p_conversation_id/);
  assert.match(sql,/if v_missing = 0 then[\s\S]*vtg_perform_chat_clear/);
  assert.match(sql,/if v_total <= 1 then/);
  for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'])assert.match(read(f),/vtg-messenger\.js\?v=20261126-messenger-1/,f);
});
test('staff email link now leads to work-email + password sign-in, not straight into the workspace',()=>{
  const a=read('workforce-access.html');
  assert.match(a,/location\.replace\('\/workforce-signin\.html\?linked=1&email='\+encodeURIComponent\(em\)\)/);
  assert.match(a,/signOut\(\{scope:'local'\}\)/);
  const s=read('workforce-signin.html');
  assert.match(s,/auth\.signInStaff\(/);assert.match(s,/params\.get\('linked'\)==='1'/);
  assert.match(read('vtg-supabase-auth.js'),/async signInStaff\(email, password\)/);
});
test('invited new staff create an account (name + password) before the invitation is accepted',()=>{
  const h=read('workforce-accept.html');
  assert.match(h,/id="signupForm"/);assert.match(h,/Create your VTG staff account/);
  assert.ok(h.indexOf('auth.client.auth.updateUser({password:a')>0);
  assert.ok(h.indexOf('updateUser({password:a')<h.indexOf('/functions/v1/workforce-invitations/accept'),'password is set before accepting');
  assert.match(h,/workforce-dashboard\.html\?workspace=/);
});
