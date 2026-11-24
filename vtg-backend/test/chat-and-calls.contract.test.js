const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrations/20261114000000_vtg_chat_and_calls.sql');
const send=read('supabase/migrations/20261123220000_secure_buyer_chat_message_send_rpc.sql');
const moderation=read('supabase/migrations/20261123210000_vtg_message_moderation_edits_and_buyer_delivery_close.sql');
const endCall=read('supabase/migrations/20261123225500_vtg_call_organizer_end_for_everyone.sql');
const finalSend=read('supabase/migrations/20261123230000_vtg_final_chat_moderation_send_rpc.sql');
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

test('buyer and supplier messages carry explicit role identity and stable role colours',()=>{
 assert.match(msgs,/role:mem\?\.role\|\|'other'/);
 assert.match(core,/dataset\.senderRole=String\(msg\.role\)/);
 assert.match(core,/roleLabel=\(\{buyer:'Buyer',supplier:'Supplier'/);
 assert.match(css,/data-sender-role="buyer"/);
 assert.match(css,/data-sender-role="supplier"/);
 assert.match(css,/is-self\[data-sender-role="buyer"\]/);
 assert.match(css,/is-self\[data-sender-role="supplier"\]/);
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

test('call organiser can end the shared call for every participant',()=>{
 assert.match(endCall,/create or replace function public\.vtg_end_call/);
 assert.match(endCall,/v_call\.started_by <> me/);
 assert.match(endCall,/status='ended'/);
 assert.match(endCall,/update public\.vtg_call_participants[\s\S]*left_at\s*=\s*coalesce\(left_at\s*,\s*now\(\)\s*\)/);
 assert.match(endCall,/delete from public\.vtg_call_signals/);
 assert.match(endCall,/grant execute on function public\.vtg_end_call\(uuid\) to authenticated/);
 assert.match(calls,/vtg_end_call/);
 assert.match(calls,/End call for everyone/);
 assert.match(calls,/startedBy/);
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

test('dashboard message sending uses an authenticated RPC and enforces active conversation membership',()=>{
 assert.match(send,/create or replace function public\.vtg_send_message/);
 assert.match(send,/v_user_id uuid := auth\.uid\(\)/);
 assert.match(send,/private\.vtg_is_conversation_member\(p_conversation_id\)/);
 assert.match(send,/p\.is_active = true/);
 assert.match(send,/length\(v_body\) > 4000/);
 assert.match(send,/revoke all on function public\.vtg_send_message/);
 assert.match(send,/grant execute on function public\.vtg_send_message\(uuid, text\) to authenticated/);
 assert.match(msgs,/client\.rpc\(replyTarget\?'vtg_send_message_with_reply':'vtg_send_message'/);
 assert.doesNotMatch(msgs,/client\.from\('messages'\)\.insert/);
});

test('chat blocks sexual, abusive and threatening messages with a sender warning and private audit event',()=>{
 assert.match(moderation,/private\.vtg_message_content_violation/);
 assert.match(moderation,/private\.vtg_message_moderation_events/);
 assert.match(moderation,/warning_count/);
 assert.match(moderation,/This message was not sent/);
 assert.match(moderation,/revoke update on public\.messages from anon, authenticated/);
 assert.match(msgs,/This message was blocked by VTG content rules/);
});
test('message edits are sender-only, time-limited and rechecked by moderation',()=>{
 assert.match(moderation,/create or replace function public\.vtg_edit_message/);
 assert.match(moderation,/v_message\.sender_id<>v_user_id/);
 assert.match(moderation,/interval '15 minutes'/);
 assert.match(moderation,/private\.vtg_message_content_violation\(v_body\)/);
 assert.match(msgs,/client\.rpc\('vtg_edit_message'/);
 assert.match(msgs,/view\.editable/);
 assert.match(core,/Edited/);
});

test('final ordered migration preserves the JSON moderation response after the legacy UUID RPC migration',()=>{
 assert.match(finalSend,/drop function if exists public\.vtg_send_message\(uuid,text\)/);
 assert.match(finalSend,/returns jsonb/);
 assert.match(finalSend,/private\.vtg_message_content_violation\(v_body\)/);
 assert.match(finalSend,/warning_count/);
 assert.match(finalSend,/grant execute on function public\.vtg_send_message\(uuid,text\) to authenticated/);
});


test('call setup can be cancelled without leaving an orphan active call',()=>{
 assert.match(calls,/cancelRequested:false/);
 assert.match(calls,/if\(!s\.callId\)\{[\s\S]*s\.cancelRequested=true/);
 assert.match(calls,/if\(s\.cancelRequested\)\{await endOrLeave\(\);return;\}/);
 assert.match(calls,/vtg_end_call':'vtg_leave_call/);
});

test('incoming call acceptance opens the chat and joins the live call',()=>{
 assert.match(calls,/const join=window\.VTGPeerMessages\?\.openWithCall;[\s\S]*join\(call\.conversation_id\)/);
 assert.match(msgs,/async openWithCall\(conversationId\)\{await openConv\(conversationId\);const live=liveCalls\[String\(conversationId\)\];if\(live\)startCall\(live\.kind\)/);
});

test('all dashboards invalidate stale call and cross-account messaging assets',()=>{
 for(const f of pages){const h=read(f);assert.match(h,/vtg-calls\.js\?v=20261124-buyer-call-repair-1/);assert.match(h,/vtg-cross-account-messages\.js\?v=20261124-buyer-call-repair-1/);}
});
