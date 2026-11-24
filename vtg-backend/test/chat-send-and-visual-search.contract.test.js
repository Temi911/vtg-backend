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
