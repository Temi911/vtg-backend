const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'buyer-dashboard.html'),'utf8');
const client=fs.readFileSync(path.join(root,'vtg-buyer-ai-supabase.js'),'utf8');
const chat=fs.readFileSync(path.join(root,'vtg-dashboard-chat.js'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/vtg-ai-assistant/index.ts'),'utf8');

test('buyer AI checklist is connected to the authenticated Supabase function',()=>{
 assert.match(html,/vtg-buyer-ai-supabase\.js/);
 assert.match(html,/maxlength="6000"/);
 assert.match(html,/aria-live="polite"/);
 assert.match(client,/window\.VTG_AUTH_READY/);
 assert.match(client,/from\('profiles'\)/);
 assert.match(client,/functions\.invoke\('vtg-ai-assistant'/);
 assert.doesNotMatch(client,/fetch\s*\(|\/api\/ai-assistant\/chat/);
});

test('VTG AI chat displays a safe fallback reply even when provider status is attached',()=>{
 assert.ok(chat.indexOf("typeof data?.reply==='string'&&data.reply.trim()") < chat.indexOf("if(data?.error)throw"));
 assert.match(chat,/const fallback=data\.mode==='fallback'\|\|Boolean\(data\.error\)/);
 assert.match(chat,/data\.error\?\.message/);
});

test('VTG AI Edge Function validates JWT, active buyer role and input limits',()=>{
 assert.match(edge,/auth\.getUser\(token\)/);
 assert.match(edge,/\["buyer", "supplier", "bank"\]\.includes\(accountRole\)/); // buyer, supplier and bank only; staff roles are rejected
 assert.match(edge,/profile\?\.is_active !== true/);
 assert.match(edge,/message\.length > 6000/);
 assert.match(edge,/RATE_LIMITED/);
 assert.match(edge,/VTG_AI_API_KEY/);
 assert.match(edge,/AI_NOT_CONFIGURED/);
 assert.match(edge,/max_tokens: 1100/);
});

test('VTG AI does not claim authority or invent trade evidence',()=>{
 assert.match(edge,/Do not invent prices, suppliers, company verification/);
 assert.match(edge,/bank, licensed professional or relevant official authority/);
 assert.match(edge,/VTG AI only provides guidance/);
 assert.doesNotMatch(client,/service_role|secret_key|OPENAI_API_KEY|VTG_AI_API_KEY/);
});
