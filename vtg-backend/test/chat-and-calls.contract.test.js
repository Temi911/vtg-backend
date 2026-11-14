const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrations/20261114000000_vtg_chat_and_calls.sql');
const calls=read('vtg-calls.js'),msgs=read('vtg-cross-account-messages.js'),ai=read('vtg-dashboard-chat.js'),core=read('vtg-chat-core.js'),css=read('vtg-chat-whatsapp.css');
const pages=['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'];

test('every dashboard loads the shared chat styles, core, calls and messages scripts in order',()=>{
 for(const f of pages){
  const h=read(f);
  assert.match(h,/vtg-chat-whatsapp\.css/,f);
  const order=['vtg-chat-core.js','vtg-dashboard-chat.js','vtg-calls.js','vtg-cross-account-messages.js'].map(n=>h.indexOf('src="/'+n));
  assert.ok(order.every(i=>i>0),f+' missing a script');
  assert.deepEqual([...order].sort((a,b)=>a-b),order,f+' scripts out of order');
  assert.match(h,/id="vtg-ai-chat"/,f);
  assert.match(h,/data-vtg-peer-chat/,f);
 }
});

test('own bubbles are right/blue and other people are left with name and per-person colour',()=>{
 assert.match(css,/\.vtg-wa-row\.is-self\{justify-content:flex-end\}/);
 assert.match(css,/\.vtg-wa-row\.is-self \.vtg-wa-bubble\{background:var\(--wa-blue\)/);
 assert.match(css,/\.vtg-wa-row\[data-tone="5"\]/);
 assert.match(css,/\.vtg-wa-row\.is-other \.vtg-wa-name\{color:var\(--tone/);
 assert.match(core,/function toneMap/);
 assert.match(core,/vtg-wa-name/);
 assert.match(msgs,/C\.toneMap\(/);
 assert.match(ai,/is-other first/);
});

test('chat renders message text only through the escaping markdown helper',()=>{
 assert.match(core,/t\.innerHTML=markdown\(msg\.text\)/);
 assert.match(core,/function inlineMarkdown\(value\)\{\n let s=esc\(value\)/);
 assert.match(core,/n\.textContent=msg\.name/);
 assert.doesNotMatch(core,/innerHTML\s*=\s*msg\.text/);
});

test('messages are limited to participants and sender cannot be spoofed',()=>{
 assert.match(sql,/create policy "members read messages"[\s\S]*vtg_is_conversation_member\(conversation_id\)/);
 assert.match(sql,/with check \(\s*sender_id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/length\(body\) between 1 and 4000/);
 assert.match(sql,/private\.vtg_trade_linked/);
 assert.match(sql,/cardinality\(partners\) > 4/);
});

test('calls are capped at 5 in the database and signalling is recipient-only',()=>{
 assert.match(sql,/max_participants integer not null default 5 check \(max_participants between 2 and 5\)/);
 assert.match(sql,/live >= c\.max_participants/);
 assert.match(sql,/Calls are limited to 5 participants/);
 assert.match(sql,/create policy "recipient reads own call signals"[\s\S]*to_user = \(select auth\.uid\(\)\)/);
 assert.match(sql,/revoke all on public\.vtg_calls, public\.vtg_call_participants, public\.vtg_call_signals from anon, authenticated/);
 assert.doesNotMatch(sql,/grant (insert|update|delete)[^;]*vtg_call/);
 assert.match(sql,/vtg_calls_one_active_per_conversation/);
});

test('call client uses RPCs, WebRTC and never service credentials',()=>{
 assert.match(calls,/vtg_start_call/);assert.match(calls,/vtg_send_call_signal/);assert.match(calls,/vtg_leave_call/);
 assert.match(calls,/RTCPeerConnection/);assert.match(calls,/getUserMedia/);
 assert.match(calls,/const MAX=5/);
 assert.doesNotMatch(calls+msgs+ai+core,/service_role|secret_key|SERVICE_ROLE/);
 assert.match(calls,/kind==='video'/);
});

test('placeholder "calls not connected" copy is gone',()=>{
 for(const f of pages)assert.doesNotMatch(read(f),/calls cannot connect until|Voice calling is not connected|Video calling is not connected/);
});

test('a voice call can switch to video (and back) per person without renegotiation',()=>{
 assert.match(calls,/addTransceiver\('video'/);
 assert.match(calls,/replaceTrack\(vt\)/);
 assert.match(calls,/replaceTrack\(null\)/);
 assert.match(calls,/data-cam/);
 assert.match(calls,/createDataChannel\('vtg-state'/);
 assert.match(calls,/dataset\.camstate/);
 assert.doesNotMatch(calls,/dataset\.cam\b/);
});

test('bank dashboard no longer throws on a missing messageCase element',()=>{
 assert.match(read('bank-trade-os.html'),/const mc=\$\('messageCase'\);if\(!mc\)return;/);
});
