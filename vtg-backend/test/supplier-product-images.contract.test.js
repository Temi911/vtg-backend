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

const catalogueMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261118090742_tighten_supplier_catalogue_trade_account_policies.sql'),'utf8');
const storageMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261118090809_remove_legacy_product_image_storage_policies.sql'),'utf8');
test('catalogue writes and public reads require an active trade supplier and VTG verification',()=>{
 assert.match(js,/account_environment/);
 assert.match(js,/p\.data\.account_environment!=='trade'/);
 assert.match(catalogueMigration,/p\.account_environment = 'trade'/);
 assert.match(catalogueMigration,/sp\.verification_status = 'verified'/);
});
test('legacy permissive product-image policies are removed and storage writes require active trade suppliers',()=>{
 assert.match(storageMigration,/drop policy if exists "suppliers manage own product images"/);
 assert.match(storageMigration,/drop policy if exists "approved suppliers upload product images"/);
 assert.match(storageMigration,/Active trade suppliers upload own product images/);
 assert.match(storageMigration,/Active trade suppliers update own product images/);
 assert.match(storageMigration,/Active trade suppliers delete own product images/);
 assert.match(storageMigration,/p\.account_environment = 'trade'/);
});
