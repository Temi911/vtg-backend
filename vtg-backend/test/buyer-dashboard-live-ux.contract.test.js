const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('buyer-dashboard.html');
const shell=read('vtg-buyer-shell.js');
const feed=read('vtg-buyer-trade-feed-supabase.js');

test('buyer trade feed exposes one live Supabase publishing surface only',()=>{
 assert.match(html,/id="liveTradePostForm"/);
 assert.match(html,/id="liveTradeFeedRows"/);
 assert.doesNotMatch(html,/id="feedForm"|id="feedRows"|Save post draft|Community feed preview|Locally saved only; publishing requires the connected trade-feed service/);
assert.match(feed, /liveTradePostForm.*addEventListener\('submit',publish\)/);
});

test('buyer calling copy describes the real WebRTC state without claiming preview-only behaviour',()=>{
 assert.match(shell,/TURN relay is not configured yet/);
 assert.doesNotMatch(shell,/No camera or microphone will be activated in this preview/);
 assert.match(html,/src="\/vtg-calls\.js/);
});

test('buyer intelligence copy distinguishes source-linked news and historical statistics from live prices',()=>{
 assert.match(shell,/Source-linked trade news and historical trade statistics are available/);
 assert.doesNotMatch(shell,/These are not live news or market-price feeds/);
});

test('saved supplier copy reflects account-level cloud storage and verification limits',()=>{
 assert.match(shell,/saved to your VTG buyer account across devices/);
 assert.doesNotMatch(shell,/Saved in this browser only/);
});
