const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..','..');
const src=fs.readFileSync(path.join(root,'supabase/functions/vtg-ai-assistant/index.ts'),'utf8');
const slice=(from,to)=>{const a=src.indexOf(from),b=src.indexOf(to,a);assert.ok(a>=0&&b>a,from);return src.slice(a,b);};
const code=stripTypeScriptTypes(
 slice('function fitContext','async function buildBusinessContext')+'\n'+
 slice('function needsLiveWebSearch','async function searchPublicWeb')+'\n'+
 slice('function isBlockedHost','let siteKnowledgeCache'));
const load=(fetchImpl)=>new Function('fetch','console',code+'\nreturn {fitContext,needsLiveWebSearch,isBlockedHost,fetchMentionedPages};')(fetchImpl,{warn(){}});

test('private and internal hosts are never fetched',()=>{
 const {isBlockedHost}=load(()=>{throw new Error('no network')});
 for(const h of ['localhost','127.0.0.1','10.0.0.5','169.254.169.254','[::1]','metadata.google.internal','intranet','printer.local','db.internal'])assert.equal(isBlockedHost(h),true,h);
 for(const h of ['en.wikipedia.org','www.nigerianports.gov.ng'])assert.equal(isBlockedHost(h),false,h);
});
test('only https links are fetched, redirects to private hosts are refused',async()=>{
 const seen=[];
 const {fetchMentionedPages}=load(async(url)=>{seen.push(url);
  if(url.startsWith('https://redirect.example.com'))return new Response(null,{status:302,headers:{location:'https://169.254.169.254/latest'}});
  return new Response('<html><title>Port Tariff</title><body><nav>menu</nav><p>Tin Can Island Port handles containers.</p><script>evil()</script></body></html>',{status:200,headers:{'content-type':'text/html'}});});
 const pages=await fetchMentionedPages('read http://plain.example.com and https://ports.example.com/tariff, also https://redirect.example.com/x');
 assert.equal(pages.length,1);assert.equal(pages[0].title,'Port Tariff');
 assert.match(pages[0].text,/Tin Can Island Port handles containers/);assert.doesNotMatch(pages[0].text,/evil|menu/);
 assert.ok(!seen.some(u=>u.startsWith('http://')||u.includes('169.254')),'blocked URLs were requested: '+seen);
});
test('non-text responses are ignored',async()=>{
 const {fetchMentionedPages}=load(async()=>new Response('x',{status:200,headers:{'content-type':'application/zip'}}));
 assert.equal(await fetchMentionedPages('see https://files.example.com/a.zip'),null);
});
test('web lookup triggers for external questions and links, not for questions about the user\'s own records',()=>{
 const {needsLiveWebSearch}=load(()=>{});
 for(const q of ['What is the current naira to yuan rate?','Any news on Lagos port congestion?','Check https://example.com/tariff','What are the import duties for tyres in Ghana, search the web'])assert.equal(needsLiveWebSearch(q),true,q);
 for(const q of ['Summarise my open quotations','What is the status of my order ORD-12?','Help me draft an RFQ for 3 trucks'])assert.equal(needsLiveWebSearch(q),false,q);
});
test('context is shortened list by list so it stays valid JSON-sized and never exceeds the budget',()=>{
 const {fitContext}=load(()=>{});
 const ctx={account:{role:'buyer'},orders:Array.from({length:6},(_,i)=>({i,t:'x'.repeat(900)})),quotes:Array.from({length:6},(_,i)=>({i,t:'y'.repeat(900)}))};
 const text=fitContext(ctx,6000);
 assert.ok(text.length<=6000);assert.doesNotThrow(()=>JSON.parse(text));assert.equal(JSON.parse(text).account.role,'buyer');
});
test('assistant sees the user\'s own plans and processes, and site knowledge loads lazily',()=>{
 for(const key of ['order_timeline','pipeline_summary','negotiation_messages','recent_chat_messages','landed_cost_estimates','fx_planning','letter_of_credit_drafts','lc_review_history'])assert.ok(src.includes(key),key);
 assert.match(src,/await import\("\.\/site-knowledge\.ts"\)/);
 assert.doesNotMatch(src,/^import .*site-knowledge/m);
 assert.ok(!/service_role|SERVICE_ROLE/.test(src),'must not use a service-role key');
});
