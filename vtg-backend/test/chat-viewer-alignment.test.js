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
 const css=read('vtg-messenger.css'),js=read('vtg-messenger.js');
 assert.match(css,/\.vtgm-row\.is-self\{justify-content:flex-end!important\}/);
 assert.match(css,/\.vtgm-row\.is-other\{justify-content:flex-start!important\}/);
 assert.match(js,/data-side="'\+\(self\?'outgoing':'incoming'\)/);
 for(const page of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'])assert.match(read(page),/vtg-messenger\.js/);
});
