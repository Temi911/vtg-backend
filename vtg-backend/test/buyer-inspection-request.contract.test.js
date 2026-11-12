const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'buyer-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'vtg-buyer-inspection-request.js'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/vtg-inspection-workflow/index.ts'),'utf8');

test('buyer inspection request form is wired to the authenticated workflow function',()=>{
 assert.match(html,/id="inspectionRequestForm"/);
 assert.match(html,/vtg-buyer-inspection-request\.js/);
 assert.match(js,/vtg-inspection-workflow\/'\+path/);
 assert.match(js,/call\('requests','POST'/);
 assert.match(js,/call\('quote','POST'/);
 assert.match(js,/from\('trade_orders'\)[\s\S]*eq\('buyer_id',userId\)/);
 assert.doesNotMatch(js,/localStorage|fetch\s*\(/);
});

test('workflow function accepts the fields the form sends',()=>{
 for(const k of ['orderId','country','city','productName','category','quantity','serviceLevel','requestedChecks'])assert.match(edge,new RegExp('body\\.'+k));
 assert.match(edge,/Buyer account required/);
});
