const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('chat send path never references an undefined "read" variable',()=>{
  const js=read('vtg-cross-account-messages.js');
  assert.doesNotMatch(js,/\bread\.id\b/);assert.doesNotMatch(js,/messages\[i\]=read\b/);assert.doesNotMatch(js,/push\(read\)/);
});
test('moderation list covers sexual, abusive and violent wording and survives letter swaps',()=>{
  const sql=read('supabase/migrations/20261124100000_vtg_widen_message_content_rules.sql');
  for(const w of ['porn','fuck','shit','kill you','rape you','sexual_content','threat_or_violence','harassment_or_abuse'])assert.ok(sql.includes(w),w);
  assert.match(sql,/translate\(v/);
});
test('marketplace photo search has a working Vercel endpoint',()=>{
  const h=require(path.join(root,'api/visual-search.js'));
  assert.equal(typeof h,'function');
  const p=h.__test.parse('```json\n{"product":"Forklift","category":"Machinery","keywords":["forklift","lift truck"],"brand":"","model":""}\n```');
  assert.equal(p.product,'Forklift');assert.equal(p.keywords.length,2);
  assert.equal(h.__test.parse('no json'),null);
  assert.match(read('vtg-visual-product-search.js'),/\/api\/visual-search/);
  assert.match(read('marketplace.html'),/vtg-visual-product-search\.js/);
});
test('public AI answers general questions but still refuses account access',()=>{
  const t=require(path.join(root,'api/ai/public-chat.js')).__test;
  assert.match(t.SYSTEM_PROMPT,/any other general-knowledge question/);
  assert.match(t.SYSTEM_PROMPT,/never share details about any VTG user/);
  assert.equal(t.isPersonalRequest('show my orders'),true);
  assert.equal(t.isPersonalRequest('Why is the sky blue?'),false);
});

test('buyer dashboard exposes photo search and searches the approved live catalogue',()=>{
  const page=read('buyer-dashboard.html'),js=read('vtg-buyer-marketplace-supabase.js');
  for(const id of ['buyerVisualPhoto','buyerVisualUpload','buyerVisualCamera','buyerVisualRun','buyerVisualStatus'])assert.ok(page.includes(id),id);
  assert.match(js,/fetch\('\/api\/visual-search'/);
  assert.match(js,/renderProducts\(\)/);
  assert.match(js,/state\.products/);
});
test('all role dashboards force incoming chat left and own chat right',()=>{
  const css=read('vtg-chat-whatsapp.css');
  assert.match(css,/\.vtg-wa-stream>\.vtg-wa-row\.is-self\{justify-content:flex-end\}/);
  assert.match(css,/\.vtg-wa-stream>\.vtg-wa-row\.is-other\{justify-content:flex-start\}/);
  for(const page of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'])assert.match(read(page),/vtg-chat-whatsapp\.css\?v=20261124-viewer-align-4/);
});
test('expanded moderation is shared by chat, edits and social feed RPCs',()=>{
  const sql=read('supabase/migrations/20261124120000_vtg_site_language_moderation_expansion.sql');
  for(const term of ['sexual_content','harassment_or_abuse','threat_or_violence','porn','fuck','violence','murder','shoot','rape'])assert.ok(sql.includes(term),term);
  const social=read('supabase/migrations/20261123214500_vtg_social_content_moderation_role_gate_fix.sql');
  const chat=read('supabase/migrations/20261123230000_vtg_final_chat_moderation_send_rpc.sql');
  assert.match(social,/private\.vtg_message_content_violation/);
  assert.match(chat,/private\.vtg_message_content_violation/);
  assert.match(chat,/warning_count/);
});

test('message side is calculated from the viewing account identity and applied to every role',()=>{
 const core=read('vtg-chat-core.js'),messages=read('vtg-cross-account-messages.js');
 assert.match(core,/function viewerOwnsMessage\(msg\)/);
 assert.match(core,/sender&&viewer\?sender===viewer:msg\?\.mine===true/);
 assert.match(core,/dataset\.messageSide/);
 assert.match(messages,/viewerId:userId/);
 for(const page of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html']){
  const html=read(page);
  assert.match(html,/vtg-chat-core\.js\?v=20261124-viewer-align-4/);
  assert.match(html,/vtg-cross-account-messages\.js\?v=20261124-buyer-call-lifecycle-2/);
  assert.match(html,/vtg-chat-whatsapp\.css\?v=20261124-viewer-align-4/);
 }
});
