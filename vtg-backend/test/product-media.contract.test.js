const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('product media module swaps photos every 2 seconds and plays videos only on click',()=>{
 const js=read('vtg-product-media.js');
 assert.match(js,/SWAP_MS=2000/);
 assert.match(js,/data-play/);
 assert.match(js,/isVideo\(list\[idx\]\)/,'slideshow must not auto-advance away from a video');
 assert.match(js,/MAX_PHOTOS=10,MAX_VIDEOS=3/);
});
test('supplier upload accepts multiple photos and videos and puts photos first',()=>{
 const js=read('vtg-supplier-products-supabase.js'),html=read('supplier-dashboard.html');
 assert.match(html,/video\/mp4,video\/webm,video\/quicktime/);
 assert.match(js,/PM\.isVideo\(u\)/);
 assert.match(html,/vtg-product-media\.js/);
});
test('buyer, public marketplace and admin review render the shared gallery',()=>{
 assert.match(read('vtg-buyer-marketplace-supabase.js'),/PM\.gallery|PM\.cardHtml/);
 assert.match(read('marketplace.html'),/VTGProductMedia/);
 assert.match(read('admin-product-review.html'),/VTGProductMedia/);
 for(const f of ['buyer-dashboard.html','marketplace.html','supplier-dashboard.html','admin-product-review.html'])assert.match(read(f),/vtg-product-media\.css/,f);
});
test('storage bucket migration allows videos',()=>{
 const sql=read('supabase/migrations/20261127150000_product_media_videos.sql');
 assert.match(sql,/video\/mp4/);assert.match(sql,/52428800/);
});
