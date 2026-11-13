const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'supplier-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'vtg-supplier-documents-supabase.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261113090000_supplier_documents_bucket.sql'),'utf8');
test('supplier document files go to a private bucket scoped to the supplier folder',()=>{
 assert.match(html,/id="supplierDocForm"/);
 assert.match(html,/vtg-supplier-documents-supabase\.js/);
 assert.match(js,/vtg-supplier-documents/);
 assert.match(js,/createSignedUrl/);
 assert.match(sql,/false, 10485760/);
 for(const op of ['select','insert','delete'])assert.match(sql,new RegExp('for '+op+' to authenticated'));
 assert.equal((sql.match(/storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/g)||[]).length,3);
});
