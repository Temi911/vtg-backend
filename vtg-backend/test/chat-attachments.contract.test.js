const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrations/20261114120000_vtg_chat_attachments.sql');
const fn=read('supabase/functions/vtg-ai-assistant/index.ts');
const pages=['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'];

test('attachment buckets are private, size-limited and mime-restricted',()=>{
 assert.match(sql,/'vtg-chat-attachments','vtg-chat-attachments',false,26214400/);
 assert.match(sql,/'vtg-ai-attachments','vtg-ai-attachments',false,20971520/);
 assert.doesNotMatch(sql,/executable|x-msdownload/);
});
test('chat attachment table is RLS-protected, member-only and not exposed to anon',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.vtg_chat_attachments from anon/);
 assert.match(sql,/private\.vtg_is_conversation_member\(conversation_id\)/);
 assert.match(sql,/m\.sender_id=\(select auth\.uid\(\)\)/);
});
test('storage policies scope AI files to the owner folder and chat files to conversation members',()=>{
 assert.match(sql,/bucket_id='vtg-ai-attachments' and \(storage\.foldername\(name\)\)\[1\]=\(select auth\.uid\(\)\)::text/);
 assert.match(sql,/bucket_id='vtg-chat-attachments'[\s\S]*vtg_is_conversation_member/);
 assert.match(sql,/\(storage\.foldername\(name\)\)\[2\]=\(select auth\.uid\(\)\)::text/);
});
test('AI function loads parsers lazily, enforces own-folder paths and treats files as untrusted',()=>{
 assert.doesNotMatch(fn,/^import .*(pdfjs|mammoth|xlsx)/m);
 assert.match(fn,/await import\("npm:pdfjs-dist/);
 assert.match(fn,/path\.startsWith\(userData\.user\.id \+ "\/"\)/);
 assert.match(fn,/untrusted evidence/);
 assert.match(fn,/The video was NOT watched/);
});
test('dashboards load the attachments script after core and before the chats',()=>{
 for(const f of pages){const h=read(f);const i=n=>h.indexOf('src="/'+n);
  assert.ok(i('vtg-chat-core.js')>0&&i('vtg-chat-attachments.js')>i('vtg-chat-core.js')&&i('vtg-dashboard-chat.js')>i('vtg-chat-attachments.js')&&i('vtg-cross-account-messages.js')>i('vtg-chat-attachments.js'),f);}
});
