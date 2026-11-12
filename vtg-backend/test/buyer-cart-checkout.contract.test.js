const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'buyer-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'vtg-buyer-cart-checkout.js'),'utf8');
test('cart checkout sends quotation requests through the existing RPC',()=>{
 assert.match(html,/id="cartCheckoutBtn"/);
 assert.match(html,/vtg-buyer-cart-checkout\.js/);
 assert.match(js,/rpc\('vtg_create_trade_quote_request'/);
 assert.match(js,/p_product_id:it\.id/);
 assert.doesNotMatch(js,/fetch\s*\(/);
});
