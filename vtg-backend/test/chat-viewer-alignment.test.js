const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('message ownership is viewer-relative for Buyer, Supplier and Bank accounts',()=>{
 const context={window:{},document:{}};
 vm.runInNewContext(read('vtg-chat-core.js'),context);
 const owns=context.window.VTGChat.viewerOwnsMessage;
 const ids={buyer:'buyer-account-id',supplier:'supplier-account-id',bank:'bank-account-id'};
 const cases=[
  {viewer:'buyer',sender:'buyer',expected:true},
  {viewer:'buyer',sender:'supplier',expected:false},
  {viewer:'supplier',sender:'buyer',expected:false},
  {viewer:'supplier',sender:'supplier',expected:true},
  {viewer:'bank',sender:'bank',expected:true},
  {viewer:'bank',sender:'buyer',expected:false},
  {viewer:'bank',sender:'supplier',expected:false}
 ];
 for(const c of cases){
  assert.equal(owns({senderId:ids[c.sender],viewerId:ids[c.viewer],role:c.sender,viewerRole:c.viewer}),c.expected, c.viewer+' viewing '+c.sender+' message');
 }
});

test('role labels never override authenticated account identity',()=>{
 const context={window:{},document:{}};
 vm.runInNewContext(read('vtg-chat-core.js'),context);
 const owns=context.window.VTGChat.viewerOwnsMessage;
 assert.equal(owns({senderId:'ACCOUNT-A',viewerId:'account-a',role:'supplier',viewerRole:'buyer'}),true);
 assert.equal(owns({senderId:'account-b',viewerId:'account-a',role:'buyer',viewerRole:'buyer',mine:true}),false);
});

test('all dashboard message streams use explicit outgoing/incoming alignment selectors',()=>{
 const css=read('vtg-chat-whatsapp.css');
 assert.match(css,/data-message-side="outgoing"[^}]*justify-content:flex-end!important/);
 assert.match(css,/data-message-side="incoming"[^}]*justify-content:flex-start!important/);
 assert.match(css,/\.vtg-peer-log>\.bubble\[data-message-side="outgoing"\][^{]*\{[^}]*align-self:flex-end!important/);
 for(const page of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html']){
  const html=read(page);
  assert.match(html,/vtg-chat-whatsapp\.css\?v=20261125-viewer-matrix-2/);
  assert.match(html,/vtg-cross-account-messages\.js/);
 }
});

test('legacy buyer chat normalizes sender and viewer IDs before deciding message side',()=>{
 const js=read('vtg-buyer-messages-supabase.js');
 assert.match(js,/normalizeUserId=value=>String\(value\?\?''\)\.trim\(\)\.toLowerCase\(\)/);
 assert.match(js,/isViewerMessage\(m\.sender_id\)/);
 assert.match(js,/data-message-side="\'+messageSide/);
 assert.doesNotMatch(js,/m\.sender_id===userId/);
});
