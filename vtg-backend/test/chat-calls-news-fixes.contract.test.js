const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('call End button is wired immediately and the starter ends the call for everyone', () => {
  const js = read('vtg-calls.js');
  const early = js.indexOf("ui.querySelector('[data-end]').onclick=()=>cleanup(true)");
  assert.ok(early > 0 && early < js.indexOf('getUserMedia'), 'End must work before microphone permission resolves');
  assert.match(js, /vtg_end_call/);
  assert.match(js, /isStarter/);
  const sql = read('supabase/migrations/20261123180000_vtg_end_call_for_everyone.sql');
  assert.match(sql, /c\.started_by <> me/);
  assert.match(sql, /revoke all on function public\.vtg_end_call\(uuid\) from public, anon/);
});

test('chat bubbles carry the sender role so buyer, supplier and bank look different', () => {
  assert.match(read('vtg-chat-core.js'), /row\.dataset\.role=/);
  assert.match(read('vtg-cross-account-messages.js'), /roleLabel/);
  const css = read('vtg-chat-whatsapp.css');
  for (const r of ['buyer', 'supplier', 'bank']) assert.ok(css.includes('[data-role="' + r + '"]'), r);
});

test('trade news cards offer like, comment and follow through guarded database functions', () => {
  const js = read('vtg-news-actions.js');
  for (const n of ['vtg_news_toggle', 'vtg_news_comment', 'vtg_news_summary', 'vtg_news_comments']) assert.ok(js.includes(n), n);
  for (const f of ['trade-feed.html', 'account-trade-feed.html', 'buyer-dashboard.html']) assert.ok(read(f).includes('vtg-news-actions.js'), f);
  const sql = read('supabase/migrations/20261123181000_vtg_news_interactions_rpc.sql');
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /from public, anon/);
  assert.doesNotMatch(sql, /grant execute[^;]*to anon/);
});
