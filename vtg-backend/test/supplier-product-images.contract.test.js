const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'supplier-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'vtg-supplier-products-supabase.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261112220000_supplier_product_images_bucket.sql'),'utf8');
test('supplier product photos upload to a bucket restricted to the supplier own folder',()=>{
 assert.match(html,/name="imageFiles" type="file"/);
 assert.match(js,/storage\.from\('vtg-product-images'\)\.upload/);
 assert.match(js,/5242880/);
 assert.match(sql,/bucket_id = 'vtg-product-images'/);
 assert.match(sql,/storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
 assert.match(sql,/p\.role::text = 'supplier'/);
 assert.match(sql,/allowed_mime_types/);
});
