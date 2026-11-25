const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const core=read('vtg-chat-core.js');
const src=core.match(/function viewerOwnsMessage\(msg\)\{[\s\S]*?\n\}/)[0];
const owns=new Function(src+';return viewerOwnsMessage;')();
const side=(viewer,sender)=>owns({senderId:sender,viewerId:viewer})?'right':'left';
test('alignment follows who is viewing: own messages right, everyone else left',()=>{
  const table=[['buyer-1','buyer-1','right'],['buyer-1','supplier-1','left'],['supplier-1','buyer-1','left'],['supplier-1','supplier-1','right'],['bank-1','bank-1','right'],['bank-1','buyer-1','left'],['bank-1','supplier-1','left']];
  for(const [v,s,exp] of table)assert.equal(side(v,s),exp,v+' viewing '+s);
});
test('group conversations: every other member, whatever the role, is on the left',()=>{
  const members=['buyer-1','buyer-2','supplier-1','supplier-2','bank-1'];
  for(const viewer of members)for(const sender of members)assert.equal(side(viewer,sender),viewer===sender?'right':'left');
  assert.equal(side('Buyer-1 ','buyer-1'),'right');
});
test('all three dashboards load the same chat renderer and stamp the viewer id on each message',()=>{
  for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html']){const h=read(f);assert.match(h,/vtg-chat-core\.js/,f);assert.match(h,/vtg-cross-account-messages\.js/,f);}
  assert.match(read('vtg-cross-account-messages.js'),/viewerId/);
  assert.match(read('vtg-chat-whatsapp.css'),/\.vtg-wa-row\.is-self\{justify-content:flex-end\}/);
});
test('ghost chat buttons stay readable on all three dashboards',()=>{
  const css=read('vtg-chat-whatsapp.css');
  assert.match(css,/\.vtg-wa \.vtg-wa-sidebtn\.ghost\{background:var\(--wa-input\)!important;color:var\(--wa-ink\)!important/);
  assert.match(css,/\.vtg-wa \.vtg-wa-head \.vtg-wa-sidebtn\.ghost\{background:rgba\(255,255,255,\.2\)!important;color:#fff!important/);
  for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'])assert.match(read(f),/vtg-chat-whatsapp\.css\?v=20261125-contrast-1/,f);
});
